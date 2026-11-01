const pool     = require('../../config/db');
const ExcelJS = require('exceljs');
const AdmZip = require('adm-zip'); // Import AdmZip

exports.exportArenaDailyReport = async (req, res) => {
  try {
    const { project, date } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, error: 'date is required (YYYY-MM-DD)' });
    }
    if (!project) {
      return res.status(400).json({ success: false, error: 'project is required' });
    }

    // 1. FETCH DATA
    const [participants] = await pool.query(
      `SELECT p.*, 
              d.round_status, d.status AS cert_status, 
              t.name AS trainer_name, t.agency
       FROM participants p
       LEFT JOIN dashboard d ON d.mpin = p.mpin
       LEFT JOIN trainers t ON t.username = p.trainer_id
       WHERE p.date = ? AND p.project_name = ?
       ORDER BY p.region, STR_TO_DATE(p.time_from, '%h:%i %p'), p.mpin`,
      [date, project]
    );

    if (!participants.length) {
      return res.status(404).json({ success: false, error: 'No data found' });
    }

    const now = new Date();

    // Parse "9:30 AM" into a full Date on the given date
    const parseTimeToDate = (dateStr, timeStr) => {
      if (!timeStr) return null;
      const match = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) return null;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = match[3].toUpperCase();
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      const d = new Date(dateStr + 'T00:00:00');
      if (isNaN(d.getTime())) return null;
      d.setHours(h, m, 0, 0);
      return d;
    };

    const enriched = participants.map(p => {
      const slotEnd = parseTimeToDate(date, p.time_to);
      const slotCompleted = slotEnd ? slotEnd < now : false;
      const isAppeared = ['Completed', 'In Progress'].includes(p.round_status);
      const certStatusStr = isAppeared ? (p.cert_status === 'Pass' ? 'Yes' : 'No') : '';
      return { ...p, slotCompleted, isAppeared, certStatusStr };
    });

    // Dynamic roles
    const rolesSet = [...new Set(enriched.map(p => p.role).filter(Boolean))].sort();
    const roles = rolesSet.length ? rolesSet : ['Unknown'];
    const numRoles = roles.length;

    const wb = new ExcelJS.Workbook();

    // ==========================================
    // SHEET 1: SUMMARY
    // ==========================================
    const wsSummary = wb.addWorksheet('Summary');

    const row1 = ['MAIN ROUND DATE', 'REGION'];
    let colIdx = 2;

    const groups = [
      { label: 'Mapped', count: numRoles + 1 },
      { label: 'Expected Attendance as per Last Time Slots', count: numRoles + 1 },
      { label: 'Appeared', count: numRoles + 1 },
      { label: 'Certified', count: numRoles + 1 },
    ];

    groups.forEach(g => { row1[colIdx] = g.label; colIdx += g.count; });
    row1[colIdx] = 'Appeared %(As per Slots)'; colIdx++;
    row1[colIdx] = '% (as per Mapped)'; colIdx++;
    row1[colIdx] = 'Certified %';
    for (let i = 0; i < row1.length; i++) if (row1[i] === undefined) row1[i] = '';
    wsSummary.addRow(row1);

    const row2 = ['', ''];
    groups.forEach(() => { roles.forEach(r => row2.push(r)); row2.push('Total'); });
    row2.push(''); row2.push('');
    roles.forEach(r => row2.push(r));
    row2.push('Total');
    wsSummary.addRow(row2);

    // Merge header groups
    let mergeCol = 3;
    groups.forEach(g => {
      wsSummary.mergeCells(1, mergeCol, 1, mergeCol + g.count - 1);
      mergeCol += g.count;
    });
    wsSummary.mergeCells(1, mergeCol, 2, mergeCol); mergeCol++;
    wsSummary.mergeCells(1, mergeCol, 2, mergeCol); mergeCol++;
    wsSummary.mergeCells(1, mergeCol, 1, mergeCol + numRoles);

    wsSummary.mergeCells('A1:A2');
    wsSummary.mergeCells('B1:B2');

    [1, 2].forEach(r => {
      wsSummary.getRow(r).eachCell({ includeEmpty: true }, cell => {
        cell.font = { bold: true, size: 10, color: { argb: 'FF000000' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    });
    wsSummary.getRow(1).height = 30;
    wsSummary.getRow(2).height = 20;

    const regions = [...new Set(enriched.map(p => p.region).filter(Boolean))].sort();

    let gtMapped = Array(numRoles).fill(0), gtMappedT = 0;
    let gtExpected = Array(numRoles).fill(0), gtExpectedT = 0;
    let gtApp = Array(numRoles).fill(0), gtAppT = 0;
    let gtCert = Array(numRoles).fill(0), gtCertT = 0;

    const pctStartCol = 3 + 4 * (numRoles + 1);

    regions.forEach(reg => {
      const rRows = enriched.filter(p => p.region === reg);

      const mapped   = roles.map(role => rRows.filter(p => p.role === role).length);
      const expected = roles.map(role => rRows.filter(p => p.role === role && p.slotCompleted).length);
      const app      = roles.map(role => rRows.filter(p => p.role === role && p.isAppeared).length);
      const cert     = roles.map(role => rRows.filter(p => p.role === role && p.isAppeared && p.cert_status === 'Pass').length);

      const tMap = mapped.reduce((a, b) => a + b, 0);
      const tExp = expected.reduce((a, b) => a + b, 0);
      const tApp = app.reduce((a, b) => a + b, 0);
      const tCert = cert.reduce((a, b) => a + b, 0);

      mapped.forEach((v, i) => gtMapped[i] += v); gtMappedT += tMap;
      expected.forEach((v, i) => gtExpected[i] += v); gtExpectedT += tExp;
      app.forEach((v, i) => gtApp[i] += v); gtAppT += tApp;
      cert.forEach((v, i) => gtCert[i] += v); gtCertT += tCert;

      const appPctSlots = tExp > 0 ? tApp / tExp : 0;
      const appPctMapped = tMap > 0 ? tApp / tMap : 0;
      const certPctPerRole = roles.map((r, i) => app[i] > 0 ? cert[i] / app[i] : 0);
      const certPctTotal = tApp > 0 ? tCert / tApp : 0;

      const row = wsSummary.addRow([
        new Date(date + 'T00:00:00'), reg,
        ...mapped, tMap,
        ...expected, tExp,
        ...app, tApp,
        ...cert, tCert,
        appPctSlots, appPctMapped,
        ...certPctPerRole, certPctTotal
      ]);

      row.eachCell({ includeEmpty: true }, (cell, c) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        if (c === 1) cell.numFmt = 'dd-mmm-yy';
      });

      [pctStartCol, pctStartCol + 1,
       ...Array.from({ length: numRoles + 1 }, (_, i) => pctStartCol + 2 + i)
      ].forEach(ci => {
        const cell = row.getCell(ci);
        if (cell.value !== null && cell.value !== undefined) cell.numFmt = '0%';
      });
    });

    // Grand total
    const gtAppPctSlots = gtExpectedT > 0 ? gtAppT / gtExpectedT : 0;
    const gtAppPctMapped = gtMappedT > 0 ? gtAppT / gtMappedT : 0;
    const gtCertPctPerRole = roles.map((r, i) => gtApp[i] > 0 ? gtCert[i] / gtApp[i] : 0);
    const gtCertPctTotal = gtAppT > 0 ? gtCertT / gtAppT : 0;

    const gtRow = wsSummary.addRow([
      'Grand Total', '',
      ...gtMapped, gtMappedT,
      ...gtExpected, gtExpectedT,
      ...gtApp, gtAppT,
      ...gtCert, gtCertT,
      gtAppPctSlots, gtAppPctMapped,
      ...gtCertPctPerRole, gtCertPctTotal
    ]);

    gtRow.eachCell({ includeEmpty: true }, cell => {
      cell.font = { bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    [pctStartCol, pctStartCol + 1,
     ...Array.from({ length: numRoles + 1 }, (_, i) => pctStartCol + 2 + i)
    ].forEach(ci => {
      const cell = gtRow.getCell(ci);
      if (cell.value !== null && cell.value !== undefined) cell.numFmt = '0%';
    });

    wsSummary.getColumn(1).width = 16;
    wsSummary.getColumn(2).width = 10;
    const lastSummaryCol = 2 + (numRoles + 1) * 4 + 2 + numRoles + 1;
    for (let i = 3; i <= lastSummaryCol; i++) wsSummary.getColumn(i).width = 12;

    // ==========================================
    // SHEET 2: STATUS
    // ==========================================
    const wsStatus = wb.addWorksheet('Status');

    wsStatus.columns = [
      { header: 'S.NO.', key: 'sno', width: 8 },
      { header: 'MAIN ROUND DATE', key: 'date', width: 16 },
      { header: 'REGION', key: 'region', width: 10 },
      { header: 'MSPIN', key: 'mpin', width: 15 },
      { header: 'DEALER CODE', key: 'dealer_code', width: 18 },
      { header: 'Dealer City', key: 'city', width: 18 },
      { header: 'DEALER NAME', key: 'dealer_name', width: 40 },
      { header: 'NAME', key: 'name', width: 28 },
      { header: 'Eligible', key: 'role', width: 15 },
      { header: 'Trainer Name', key: 'trainer_name', width: 22 },
      { header: 'Agency', key: 'agency', width: 12 },
      { header: 'Time From', key: 'time_from', width: 12 },
      { header: 'Time To', key: 'time_to', width: 12 },
      { header: 'Time Slots Completed', key: 'slot_completed', width: 20 },
      { header: 'Appeared Status', key: 'appeared_status', width: 18 },
      { header: 'Certified Status', key: 'cert_status', width: 18 }
    ];

    const hRow = wsStatus.getRow(1);
    hRow.height = 30;
    hRow.eachCell(cell => {
      cell.font = { bold: true, size: 10, color: { argb: 'FF000000' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    enriched.forEach((p, idx) => {
      const row = wsStatus.addRow({
        sno: idx + 1,
        date: new Date(date + 'T00:00:00'),
        region: p.region,
        mpin: p.mpin,
        dealer_code: p.dealer_code,
        city: p.city,
        dealer_name: p.dealer_name,
        name: p.name,
        role: p.role,
        trainer_name: p.trainer_name || '—',
        agency: p.agency || '—',
        time_from: p.time_from,
        time_to: p.time_to,
        slot_completed: p.slotCompleted ? 'Yes' : '',
        appeared_status: p.isAppeared ? 'Appeared' : 'Not Appeared',
        cert_status: p.certStatusStr
      });

      row.eachCell({ includeEmpty: true }, cell => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });

      row.getCell('date').numFmt = 'dd-mmm-yy';
      row.getCell('dealer_name').alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell('name').alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell('city').alignment = { vertical: 'middle', horizontal: 'left' };
    });

    // ==========================================
    // SEND RESPONSE
    // ==========================================
    const filename = `Arena_Daily_Report_${date}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await wb.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('[exportArenaDailyReport]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
exports.exportArenaOverallAttendance = async (req, res) => {
  try {
    // No query params needed - use today's date automatically
    const today = new Date();
    today.setHours(0, 0, 0, 0); // normalize to start of day
    
    // Fetch ALL Arena data
    const [participants] = await pool.query(
      `SELECT 
          p.*,
          d.round_status,
          t.name          AS faculty,
          t.agency,
          t.base_location
       FROM participants p
       LEFT JOIN dashboard d ON d.mpin = p.mpin
       LEFT JOIN trainers  t ON t.username = p.trainer_id
       WHERE (p.project_name = 'Arena'
              OR p.project_name IN ('Arena L1', 'Arena L2')
              OR p.project_name LIKE 'Arena%')
       ORDER BY p.date DESC, p.region, STR_TO_DATE(p.time_from, '%h:%i %p'), p.mpin`,
      []
    );

    if (!participants.length) {
      return res.status(404).json({ success: false, error: 'No data found' });
    }

    const wb = new ExcelJS.Workbook();

    const buildSheet = (sheetName, eligibleHeader, levelRows) => {
      const ws = wb.addWorksheet(sheetName);
      
      ws.columns = [
        { header: 'S.NO.',            key: 'sno',           width: 8 },
        { header: 'Level',            key: 'level',         width: 8 },
        { header: 'REGION',           key: 'region',        width: 10 },
        { header: 'MSPIN',            key: 'mpin',          width: 15 },
        { header: 'DEALER CODE',      key: 'dealer_code',   width: 18 },
        { header: 'Dealer City',      key: 'city',          width: 18 },
        { header: 'DEALER NAME',      key: 'dealer_name',   width: 40 },
        { header: 'NAME',             key: 'name',          width: 28 },
        { header: eligibleHeader,     key: 'eligible',      width: 16 },
        { header: 'Date',             key: 'date',          width: 14 },
        { header: 'Agency',           key: 'agency',        width: 12 },
        { header: 'Faculty',          key: 'faculty',       width: 22 },
        { header: 'Base location',    key: 'base_location', width: 20 },
        { header: 'Time From',        key: 'time_from',     width: 12 },
        { header: 'Time To',          key: 'time_to',       width: 12 },
        { header: 'Attendance',       key: 'attendance',    width: 18 }
      ];
      
      const headerRow = ws.getRow(1);
      headerRow.height = 30;
      headerRow.eachCell(cell => {
        cell.font = { bold: true, size: 10, color: { argb: 'FF000000' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });
      
      levelRows.forEach((p, idx) => {
        const participantDate = p.date ? new Date(p.date) : null;
        if (participantDate) participantDate.setHours(0, 0, 0, 0);
        
        const appeared = ['Completed', 'In Progress'].includes(p.round_status);
        
        let attendanceStatus;
        if (appeared) {
          attendanceStatus = 'Appeared';
        } else if (participantDate && participantDate > today) {
          attendanceStatus = 'Pending';
        } else {
          attendanceStatus = 'Absent';
        }
        
        const row = ws.addRow({
          sno:           idx + 1,
          level:         p.level,
          region:        p.region,
          mpin:          p.mpin,
          dealer_code:   p.dealer_code,
          city:          p.city,
          dealer_name:   p.dealer_name,
          name:          p.name,
          eligible:      p.role || '',
          date:          participantDate,
          agency:        p.agency || '—',
          faculty:       p.faculty || '—',
          base_location: p.base_location || '—',
          time_from:     p.time_from,
          time_to:       p.time_to,
          attendance:    attendanceStatus
        });
        
        row.eachCell({ includeEmpty: true }, cell => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
          };
        });
        
        row.getCell('dealer_name').alignment   = { vertical: 'middle', horizontal: 'left' };
        row.getCell('name').alignment          = { vertical: 'middle', horizontal: 'left' };
        row.getCell('city').alignment          = { vertical: 'middle', horizontal: 'left' };
        row.getCell('faculty').alignment       = { vertical: 'middle', horizontal: 'left' };
        row.getCell('base_location').alignment = { vertical: 'middle', horizontal: 'left' };
        
        if (row.getCell('date').value) {
          row.getCell('date').numFmt = 'dd-mmm-yy';
        }
      });
      
      ws.views = [{ state: 'frozen', ySplit: 1 }];
      ws.autoFilter = { from: 'A1', to: `P${levelRows.length + 1}` };
    };

    const l1Rows = participants.filter(p => p.level === 'L1');
    const l2Rows = participants.filter(p => p.level === 'L2');

    if (l1Rows.length) {
      buildSheet('L1_Eligible', 'L1_Eligible', l1Rows);
    }
    if (l2Rows.length) {
      buildSheet('L2_Eligible', 'L2_Eligible', l2Rows);
    }
    if (!l1Rows.length && !l2Rows.length) {
      buildSheet('Arena', 'Eligible', participants);
    }

    const dateStr = today.toISOString().split('T')[0];
    const filename = `Arena_Overall_Attendance_${dateStr}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await wb.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('[exportArenaOverallAttendance]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
exports.exportArenaOverallResult = async (req, res) => {
  try {
    const { project } = req.query;

    if (!project) {
      return res.status(400).json({ success: false, error: 'Project query parameter is required' });
    }

    // --- 1. FETCH DATA SEPARATELY TO PREVENT DATA LOSS ---
    
    const [r1Data] = await pool.query(
      `SELECT region, role AS eligible, appeared_status AS r1_appeared 
       FROM round_1 
       WHERE project_name = ?`, 
      [project]
    );

    const [mainData] = await pool.query(
      `SELECT p.region, p.role AS eligible, 
              IFNULL(d.marks, 0) AS main_round, 
              d.status AS main_cert_status, 
              d.round_status AS main_round_status
       FROM participants p
       LEFT JOIN dashboard d ON d.mpin = p.mpin
       WHERE p.project_name = ?`, 
      [project]
    );

    const [participants] = await pool.query(
      `SELECT p.date AS main_round_date,   -- CHANGED TO USE p.date directly
              p.region AS region, 
              p.mpin, p.dealer_code, p.city AS dealer_city,
              p.dealer_name, p.name, p.role AS eligible, 
              r1.appeared_status AS r1_appeared,
              CASE WHEN d.round_status IN ('Completed', 'In Progress') THEN 'Appeared' ELSE 'Not Appeared' END AS appeared_status,
              IFNULL(d.marks, 0) AS main_round,
              CASE WHEN d.status = 'Pass' THEN 'Yes' ELSE 'No' END AS certified_status
       FROM participants p
       LEFT JOIN round_1 r1 ON r1.mpin = p.mpin
       LEFT JOIN dashboard d ON d.mpin = p.mpin
       WHERE p.project_name = ?
       ORDER BY p.date DESC, p.region, p.mpin`,
      [project]
    );

    if (!participants.length) {
      return res.status(404).json({ success: false, error: 'No data found for this project' });
    }

    const wb = new ExcelJS.Workbook();
    
    const roles = [...new Set([...r1Data.map(r => r.eligible), ...mainData.map(r => r.eligible)].filter(Boolean))].sort();
    const numRoles = roles.length;

    // ==========================================
    // SHEET 1: SUMMARY
    // ==========================================
    const wsSummary = wb.addWorksheet('Summary');

    const header1 = [
      'REGION', 
      'Eligible (R1)', ...Array(numRoles).fill(''),
      'R1 Appeared', ...Array(numRoles).fill(''),
      'Eligible Main Round', ...Array(numRoles).fill(''),
      'Appeared Main Round', ...Array(numRoles).fill(''),
      'Certified Main Round', ...Array(numRoles).fill(''),
      'Certified % From Appeared', 'Certified % from R1 Eligible'
    ];

    const header2 = [
      '', ...roles, 'Total', ...roles, 'Total', ...roles, 'Total', ...roles, 'Total', ...roles, 'Total', '', ''
    ];

    wsSummary.addRow(header1);
    wsSummary.addRow(header2);

    wsSummary.mergeCells('A1:A2');
    let col = 2;
    for(let i=0; i<5; i++) { wsSummary.mergeCells(1, col, 1, col + numRoles); col += numRoles + 1; }
    wsSummary.mergeCells(1, col, 2, col); col += 1;
    wsSummary.mergeCells(1, col, 2, col);

    [1, 2].forEach(rowNum => {
      wsSummary.getRow(rowNum).eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { bold: true, size: 10, color: { argb: 'FF000000' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
      });
    });

    const regions = [...new Set([...r1Data.map(r => r.region), ...mainData.map(r => r.region)])].filter(Boolean).sort();

    let gt = Array(5).fill().map(() => Array(numRoles).fill(0));
    let gtT = Array(5).fill(0);

    const summaryRows = [];

    regions.forEach(region => {
      const r1Rows = r1Data.filter(r => r.region === region);
      const mRows = mainData.filter(r => r.region === region);

      const eligR1 = roles.map(role => r1Rows.filter(r => r.eligible === role).length);
      const appR1 = roles.map(role => r1Rows.filter(r => r.eligible === role && r.r1_appeared === 'Appeared').length);
      const eligMain = roles.map(role => mRows.filter(r => r.eligible === role).length);
      const appMain = roles.map(role => mRows.filter(r => r.eligible === role && ['Completed', 'In Progress'].includes(r.main_round_status)).length);
      const certMain = roles.map(role => mRows.filter(r => r.eligible === role && r.main_cert_status === 'Pass').length);

      const totEligR1 = eligR1.reduce((a, b) => a + b, 0);
      const totAppR1 = appR1.reduce((a, b) => a + b, 0);
      const totEligMain = eligMain.reduce((a, b) => a + b, 0);
      const totAppMain = appMain.reduce((a, b) => a + b, 0);
      const totCert = certMain.reduce((a, b) => a + b, 0);

      [eligR1, appR1, eligMain, appMain, certMain].forEach((arr, i) => {
        arr.forEach((v, j) => gt[i][j] += v);
        gtT[i] += arr.reduce((a,b)=>a+b, 0);
      });

      summaryRows.push([
        region,
        ...eligR1, totEligR1,
        ...appR1, totAppR1,
        ...eligMain, totEligMain,
        ...appMain, totAppMain,
        ...certMain, totCert,
        totAppMain > 0 ? totCert / totAppMain : 0,
        totEligR1 > 0 ? totCert / totEligR1 : 0
      ]);
    });

    summaryRows.push([
      'Grand Total',
      ...gt[0], gtT[0],
      ...gt[1], gtT[1],
      ...gt[2], gtT[2],
      ...gt[3], gtT[3],
      ...gt[4], gtT[4],
      gtT[3] > 0 ? gtT[4] / gtT[3] : 0,
      gtT[0] > 0 ? gtT[4] / gtT[0] : 0
    ]);

    summaryRows.forEach((data, idx) => {
      const r = wsSummary.addRow(data);
      const isGrand = idx === summaryRows.length - 1;
      r.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        if (isGrand) cell.font = { bold: true };
        
        if (colNum >= 2 + (numRoles + 1) * 5) {
          cell.numFmt = '0%';
        }
      });
    });

    // ==========================================
    // SHEET 2: STATUS (Detailed)
    // ==========================================
    const wsStatus = wb.addWorksheet('Status');
    
    wsStatus.columns = [
      { header: 'S.NO.', key: 'sno', width: 8 },
      { header: 'MAIN ROUND DATE', key: 'main_round_date', width: 18 },
      { header: 'REGION', key: 'region', width: 10 },
      { header: 'MSPIN', key: 'mpin', width: 15 },
      { header: 'DEALER CODE', key: 'dealer_code', width: 15 },
      { header: 'Dealer City', key: 'dealer_city', width: 18 },
      { header: 'DEALER NAME', key: 'dealer_name', width: 45 },
      { header: 'NAME', key: 'name', width: 25 },
      { header: 'Eligible', key: 'eligible', width: 18 },
      { header: 'Status', key: 'appeared_status', width: 18 },
      { header: 'Main Round', key: 'main_round', width: 12 },
      { header: 'Certified Status', key: 'certified_status', width: 18 }
    ];

    const hRow = wsStatus.getRow(1);
    hRow.height = 30;
    hRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FF000000' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    participants.forEach((r, idx) => {
      const isAppeared = r.appeared_status === 'Appeared';
      const displayScore = isAppeared ? r.main_round : '';
      const displayCertified = isAppeared ? r.certified_status : '';

      const row = wsStatus.addRow({
        sno: idx + 1,
        main_round_date: r.main_round_date ? new Date(r.main_round_date) : '',
        region: r.region, mpin: r.mpin, dealer_code: r.dealer_code, dealer_city: r.dealer_city,
        dealer_name: r.dealer_name, name: r.name, eligible: r.eligible,
        appeared_status: r.appeared_status, main_round: displayScore, certified_status: displayCertified
      });

      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });

      if (row.getCell('main_round_date').value) row.getCell('main_round_date').numFmt = 'dd-mmm-yy';
      row.getCell('dealer_name').alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell('name').alignment = { vertical: 'middle', horizontal: 'left' };
    });

    const safeProject = String(project).replace(/[^a-z0-9]+/gi, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Arena_Overall_Result_${safeProject}.xlsx"`);
    
    await wb.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('[exportArenaOverallResult]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.exportArenaWinnerSummary = async (req, res) => {
  try {
    const { project } = req.query;

    if (!project) {
      return res.status(400).json({ success: false, error: 'Project query parameter is required' });
    }

    const [r1Data] = await pool.query(
      `SELECT region, role AS eligible, appeared_status AS r1_appeared 
       FROM round_1 
       WHERE project_name = ?`, 
      [project]
    );

    const [mainData] = await pool.query(
      `SELECT p.region, p.role AS eligible, 
              d.status AS main_cert_status, 
              d.round_status AS main_round_status
       FROM participants p
       LEFT JOIN dashboard d ON d.mpin = p.mpin
       WHERE p.project_name = ?`, 
      [project]
    );

    const [winnerData] = await pool.query(
      `SELECT 
          p.date AS main_round_date,
          p.region, p.mpin, p.dealer_code, p.city AS dealer_city,
          p.dealer_name, p.name, p.role AS eligible,
          r1.category_score, r1.total_r1,
          IFNULL(d.marks, 0) AS main_round,
          d.status AS cert_status,
          d.round_status AS main_round_status
       FROM participants p
       LEFT JOIN round_1 r1 ON r1.mpin = p.mpin
       LEFT JOIN dashboard d ON d.mpin = p.mpin
       WHERE p.project_name = ?
       ORDER BY p.date DESC, p.region, p.mpin`,
      [project]
    );

    if (!winnerData.length) {
      return res.status(404).json({ success: false, error: 'No data found for this project' });
    }

    const wb = new ExcelJS.Workbook();
    
    const roles = [...new Set([...r1Data.map(r => r.eligible), ...mainData.map(r => r.eligible), ...winnerData.map(r => r.eligible)].filter(Boolean))].sort();
    const numRoles = roles.length;

    // Collect dynamic category columns from ANY row that has category_score
    const allCategories = new Set();
    winnerData.forEach(r => {
      if (r.category_score) {
        try {
          const json = typeof r.category_score === 'string' ? JSON.parse(r.category_score) : r.category_score;
          if (json) Object.keys(json).forEach(k => allCategories.add(k));
        } catch (e) {}
      }
    });
    
    const catOrder = ['Product', 'Advance Technology', 'VAS', 'Soft Skills'];
    const dynamicCategories = Array.from(allCategories).sort((a, b) => {
      const idxA = catOrder.indexOf(a) !== -1 ? catOrder.indexOf(a) : 999;
      const idxB = catOrder.indexOf(b) !== -1 ? catOrder.indexOf(b) : 999;
      return idxA - idxB;
    });

    // ==========================================================
    // FIX: Parse category_score + total_r1 for ALL participants,
    //       not only those who appeared in the main round.
    // ==========================================================
    const parsedWinnerData = winnerData.map(r => {
      const isAppeared = ['Completed', 'In Progress'].includes(r.main_round_status);

      let scoreObj = {};
      if (r.category_score) {
        try {
          scoreObj = typeof r.category_score === 'string'
            ? JSON.parse(r.category_score)
            : r.category_score;
        } catch (e) {}
      }

      const row = {
        ...r,
        isAppeared,
        main_round: Number(r.main_round) || 0,
        total_r1: Number(r.total_r1) || 0,          // <-- always kept
      };

      dynamicCategories.forEach(cat => {
        row[cat] = scoreObj[cat] !== undefined ? Number(scoreObj[cat]) : 0; // <-- always filled
      });

      return row;
    });

    parsedWinnerData.sort((a, b) => {
      if (a.region !== b.region) return a.region.localeCompare(b.region);
      if (a.eligible !== b.eligible) return a.eligible.localeCompare(b.eligible);

      // Appeared participants ranked first
      if (a.isAppeared !== b.isAppeared) return a.isAppeared ? -1 : 1;
      if (!a.isAppeared) return a.mpin.localeCompare(b.mpin);

      if (b.main_round !== a.main_round) return b.main_round - a.main_round;
      if (b.total_r1 !== a.total_r1) return b.total_r1 - a.total_r1;
      for (const cat of dynamicCategories) {
        if (b[cat] !== a[cat]) return b[cat] - a[cat];
      }
      return 0;
    });

    let currentTier = 1;
    let lastRow = null;

    parsedWinnerData.forEach((row) => {
      if (!row.isAppeared) {
        row.Rank = '';
        return;
      }

      if (!lastRow || lastRow.region !== row.region || lastRow.eligible !== row.eligible) {
        currentTier = 1;
      } else {
        let isTie = true;
        if (lastRow.main_round !== row.main_round) isTie = false;
        else if (lastRow.total_r1 !== row.total_r1) isTie = false;
        else {
          for (const cat of dynamicCategories) {
            if (lastRow[cat] !== row[cat]) { isTie = false; break; }
          }
        }
        if (!isTie) currentTier++;
      }
      
      row.Rank = currentTier <= 3 ? currentTier : '';
      lastRow = row;
    });

    // ==========================================
    // SHEET 1: SUMMARY (unchanged)
    // ==========================================
    const wsSummary = wb.addWorksheet('Summary');
    const header1 = [
      'REGION', 'Eligible (R1)', ...Array(numRoles).fill(''), 'R1 Appeared', ...Array(numRoles).fill(''),
      'Eligible Main Round', ...Array(numRoles).fill(''), 'Appeared Main Round', ...Array(numRoles).fill(''),
      'Certified Main Round', ...Array(numRoles).fill(''), 'Certified % From Appeared', 'Certified % from R1 Eligible'
    ];
    const header2 = [
      '', ...roles, 'Total', ...roles, 'Total', ...roles, 'Total', ...roles, 'Total', ...roles, 'Total', '', ''
    ];

    wsSummary.addRow(header1);
    wsSummary.addRow(header2);

    wsSummary.mergeCells('A1:A2');
    let col = 2;
    for (let i = 0; i < 5; i++) { wsSummary.mergeCells(1, col, 1, col + numRoles); col += numRoles + 1; }
    wsSummary.mergeCells(1, col, 2, col); col += 1;
    wsSummary.mergeCells(1, col, 2, col);

    [1, 2].forEach(rowNum => {
      wsSummary.getRow(rowNum).eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { bold: true, size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
      });
    });

    const regions = [...new Set([...r1Data.map(r => r.region), ...mainData.map(r => r.region)])].filter(Boolean).sort();
    let gt = Array(5).fill().map(() => Array(numRoles).fill(0));
    let gtT = Array(5).fill(0);
    const summaryRows = [];

    regions.forEach(region => {
      const r1Rows = r1Data.filter(r => r.region === region);
      const mRows  = mainData.filter(r => r.region === region);

      const eligR1    = roles.map(role => r1Rows.filter(r => r.eligible === role).length);
      const appR1     = roles.map(role => r1Rows.filter(r => r.eligible === role && r.r1_appeared === 'Appeared').length);
      const eligMain  = roles.map(role => mRows.filter(r => r.eligible === role).length);
      const appMain   = roles.map(role => mRows.filter(r => r.eligible === role && ['Completed', 'In Progress'].includes(r.main_round_status)).length);
      const certMain  = roles.map(role => mRows.filter(r => r.eligible === role && r.main_cert_status === 'Pass').length);

      const totEligR1   = eligR1.reduce((a, b) => a + b, 0);
      const totAppR1    = appR1.reduce((a, b) => a + b, 0);
      const totEligMain = eligMain.reduce((a, b) => a + b, 0);
      const totAppMain  = appMain.reduce((a, b) => a + b, 0);
      const totCert     = certMain.reduce((a, b) => a + b, 0);

      [eligR1, appR1, eligMain, appMain, certMain].forEach((arr, i) => {
        arr.forEach((v, j) => gt[i][j] += v);
        gtT[i] += arr.reduce((a, b) => a + b, 0);
      });

      summaryRows.push([
        region, ...eligR1, totEligR1, ...appR1, totAppR1, ...eligMain, totEligMain,
        ...appMain, totAppMain, ...certMain, totCert,
        totAppMain > 0 ? totCert / totAppMain : 0,
        totEligR1 > 0 ? totCert / totEligR1 : 0
      ]);
    });

    summaryRows.push([
      'Grand Total', ...gt[0], gtT[0], ...gt[1], gtT[1], ...gt[2], gtT[2], ...gt[3], gtT[3], ...gt[4], gtT[4],
      gtT[3] > 0 ? gtT[4] / gtT[3] : 0,
      gtT[0] > 0 ? gtT[4] / gtT[0] : 0
    ]);

    summaryRows.forEach((data, idx) => {
      const r = wsSummary.addRow(data);
      const isGrand = idx === summaryRows.length - 1;
      r.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        if (isGrand) cell.font = { bold: true };
        if (colNum >= 2 + (numRoles + 1) * 5) cell.numFmt = '0%';
      });
    });

    // ==========================================
    // SHEET 2: WINNER SUMMARY
    // ==========================================
    const wsWinner = wb.addWorksheet('Winner Summary');

    wsWinner.columns = [
      { header: 'S.NO.', key: 'sno', width: 8 },
      { header: 'MAIN ROUND DATE', key: 'date', width: 18 },
      { header: 'REGION', key: 'region', width: 10 },
      { header: 'MSPIN', key: 'mpin', width: 15 },
      { header: 'DEALER CODE', key: 'dealer_code', width: 15 },
      { header: 'Dealer City', key: 'dealer_city', width: 18 },
      { header: 'DEALER NAME', key: 'dealer_name', width: 40 },
      { header: 'NAME', key: 'name', width: 25 },
      { header: 'Eligible', key: 'eligible', width: 18 },
      { header: 'Appeared Status', key: 'appeared_status', width: 18 },
      ...dynamicCategories.map(cat => ({ header: cat, key: cat, width: 15 })),
      { header: 'Total-R1', key: 'total_r1', width: 12 },
      { header: 'R3+R2', key: 'main_round', width: 14 },
      { header: 'Certified Status', key: 'certified_status', width: 18 },
      { header: 'Rank', key: 'rank', width: 10 }
    ];

    const hRow2 = wsWinner.getRow(1);
    hRow2.height = 30;
    hRow2.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FF000000' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    parsedWinnerData.forEach((r, idx) => {
      const rowData = {
        sno: idx + 1,
        date: r.main_round_date ? new Date(r.main_round_date) : '',
        region: r.region,
        mpin: r.mpin,
        dealer_code: r.dealer_code,
        dealer_city: r.dealer_city,
        dealer_name: r.dealer_name,
        name: r.name,
        eligible: r.eligible,
        appeared_status: r.isAppeared ? 'Appeared' : 'Not Appeared',
        total_r1: r.total_r1,                                               // R1 always shown
        main_round: r.isAppeared ? r.main_round : '',                       // empty for not appeared
        certified_status: r.isAppeared ? (r.cert_status === 'Pass' ? 'Yes' : 'No') : '',
        rank: r.Rank
      };

      dynamicCategories.forEach(cat => {
        rowData[cat] = r[cat] !== undefined ? r[cat] : '';                  // R1 category always shown
      });

      const row = wsWinner.addRow(rowData);

      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });

      if (row.getCell('date').value) row.getCell('date').numFmt = 'dd-mmm-yy';
      row.getCell('dealer_name').alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell('name').alignment        = { vertical: 'middle', horizontal: 'left' };
    });

    const safeProject = String(project).replace(/[^a-z0-9]+/gi, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Winner_Summary_${safeProject}.xlsx"`);

    await wb.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('[exportArenaWinnerSummary]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getArenaFilters = async (req, res) => {
  try {
    const { project } = req.query;

    // If no project selected → return list of distinct projects
    if (!project) {
      const [projects] = await pool.query(
        `SELECT DISTINCT project_name
         FROM participants
         WHERE project_name IS NOT NULL
         ORDER BY project_name`
      );

      return res.json({
        success: true,
        projects: projects.map(p => p.project_name)
      });
    }

    // If project given → return distinct dates for that project
    const [dates] = await pool.query(
      `SELECT DISTINCT date
       FROM participants
       WHERE project_name = ?
         AND date IS NOT NULL
       ORDER BY date DESC`,
      [project]
    );

    return res.json({
      success: true,
      project,
      dates: dates.map(d => d.date)
    });

  } catch (err) {
    console.error('[getArenaFilters]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.exportTVMorning = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, error: 'Date is required' });

    const projects = ['TV_DSE&EV_L1', 'TV_TL_L1', 'TV_L2'];

    // ==========================================
    // 1. FETCH DATA
    // ==========================================
    const [participants] = await pool.query(
      `SELECT p.*, 
              d.round_status, d.status AS cert_status, 
              t.name AS trainer_name, t.agency
       FROM participants p
       LEFT JOIN dashboard d ON d.mpin = p.mpin
       LEFT JOIN trainers t ON t.username = p.trainer_id
       WHERE p.date = ? AND p.project_name IN (?)
       ORDER BY p.region, STR_TO_DATE(p.time_from, '%h:%i %p'), p.mpin`,
      [date, projects]
    );

    if (!participants.length) return res.status(404).json({ success: false, error: 'No data found' });

    const mpins = participants.map(p => p.mpin);
    const [rounds] = await pool.query(
      `SELECT mpin, round_name, score FROM participant_rounds WHERE mpin IN (?)`,
      [mpins]
    );

    const roundMap = {};
    rounds.forEach(r => {
      (roundMap[r.mpin] ||= {})[r.round_name] = r.score;
    });

    // ==========================================
    // 1.b FETCH ROUND CONFIG (NO HARDCODED ROUNDS)
    // ==========================================
    const [configs] = await pool.query(
      `SELECT project_name, rounds FROM project_round_config WHERE project_name IN (?)`,
      [projects]
    );

    const projectRounds = {};
    configs.forEach(c => {
      const parsed = typeof c.rounds === 'string' ? JSON.parse(c.rounds) : c.rounds;
      projectRounds[c.project_name] = parsed.map(r => r.name);
    });

    // Group projects that share the same round set — drives column layout
    const roundColumnGroups = [];
    const groupByKey = {};
    Object.entries(projectRounds).forEach(([proj, rList]) => {
      if (!rList || !rList.length) return;
      const key = rList.join('|');
      if (!groupByKey[key]) {
        groupByKey[key] = { label: [], rounds: rList };
        roundColumnGroups.push(groupByKey[key]);
      }
      groupByKey[key].label.push(proj);
    });
    roundColumnGroups.forEach(g => { g.label = g.label.join('+'); });

    const allRoundCols = roundColumnGroups.flatMap(g => g.rounds);
    const totalRoundCols = allRoundCols.length;

    // ==========================================
    // 2. WORKBOOK 1: MAIN ROUND REPORT
    // ==========================================
    const wbMorning = new ExcelJS.Workbook();

    // --- SHEET 1: SUMMARY (roles already dynamic) ---
    const wsSummary = wbMorning.addWorksheet('Summary');
    const roles = [...new Set(participants.map(p => p.role).filter(Boolean))].sort();

    const buildSummaryBlock = (title, data) => {
      wsSummary.addRow([title]);
      wsSummary.mergeCells(wsSummary.lastRow.number, 1, wsSummary.lastRow.number, 20);
      wsSummary.lastRow.font = { bold: true, size: 12 };

      const hr1 = [
        'MAIN ROUND DATE', 'REGION',
        'Mapped', ...Array(roles.length - 1).fill(''), 'Total',
        'Appeared', ...Array(roles.length - 1).fill(''), 'Total', 'Appeared %',
        'Certified', ...Array(roles.length - 1).fill(''), 'Total', 'Certified % from Appeared'
      ];
      wsSummary.addRow(hr1);

      const hr2 = ['', '', ...roles, 'Total', ...roles, 'Total', '', ...roles, 'Total', ''];
      wsSummary.addRow(hr2);

      const startRow = wsSummary.lastRow.number - 1;
      wsSummary.mergeCells(startRow, 1, startRow + 1, 1);
      wsSummary.mergeCells(startRow, 2, startRow + 1, 2);

      let colIdx = 3;
      wsSummary.mergeCells(startRow, colIdx, startRow, colIdx + roles.length); colIdx += roles.length + 1;
      wsSummary.mergeCells(startRow, colIdx, startRow, colIdx + roles.length); colIdx += roles.length + 1;
      wsSummary.mergeCells(startRow, colIdx, startRow + 1, colIdx); colIdx += 1;
      wsSummary.mergeCells(startRow, colIdx, startRow, colIdx + roles.length); colIdx += roles.length + 1;
      wsSummary.mergeCells(startRow, colIdx, startRow + 1, colIdx);

      [startRow, startRow + 1].forEach(rNum => {
        wsSummary.getRow(rNum).eachCell({ includeEmpty: true }, (cell) => {
          cell.font = { bold: true, size: 10, color: { argb: 'FF000000' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
      });

      const regions = [...new Set(data.map(p => p.region).filter(Boolean))].sort();
      let gtMapped = Array(roles.length).fill(0), gtMappedT = 0;
      let gtApp = Array(roles.length).fill(0), gtAppT = 0;
      let gtCert = Array(roles.length).fill(0), gtCertT = 0;
      const dataRows = [];

      regions.forEach(reg => {
        const rRows = data.filter(p => p.region === reg);
        const mapped = roles.map(role => rRows.filter(p => p.role === role).length);
        const app = roles.map(role => rRows.filter(p => p.role === role && ['Completed', 'In Progress'].includes(p.round_status)).length);
        const cert = roles.map(role => rRows.filter(p => p.role === role && p.cert_status === 'Pass').length);

        const tMap = mapped.reduce((a, b) => a + b, 0);
        const tApp = app.reduce((a, b) => a + b, 0);
        const tCert = cert.reduce((a, b) => a + b, 0);

        mapped.forEach((v, i) => gtMapped[i] += v); gtMappedT += tMap;
        app.forEach((v, i) => gtApp[i] += v); gtAppT += tApp;
        cert.forEach((v, i) => gtCert[i] += v); gtCertT += tCert;

        dataRows.push([new Date(date), reg, ...mapped, tMap, ...app, tApp, tMap > 0 ? tApp / tMap : 0, ...cert, tCert, tApp > 0 ? tCert / tApp : null]);
      });

      dataRows.push(['Grand Total', '', ...gtMapped, gtMappedT, ...gtApp, gtAppT, gtMappedT > 0 ? gtAppT / gtMappedT : 0, ...gtCert, gtCertT, gtAppT > 0 ? gtCertT / gtAppT : null]);

      dataRows.forEach((rData, idx) => {
        const r = wsSummary.addRow(rData);
        const isGrand = idx === dataRows.length - 1;
        r.eachCell({ includeEmpty: true }, (cell, c) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          if (isGrand) cell.font = { bold: true };
          if (c === 1) cell.numFmt = 'dd-mmm-yy';

          const appPctIdx = 3 + (roles.length + 1) * 2;
          const certPctIdx = 3 + (roles.length + 1) * 3 + 1;
          if (c === appPctIdx) { if (cell.value === 0) cell.value = '#DIV/0!'; else cell.numFmt = '0%'; }
          if (c === certPctIdx) { if (cell.value === null) cell.value = '#DIV/0!'; else cell.numFmt = '0%'; }
        });
      });
      wsSummary.addRow([]); wsSummary.addRow([]);
    };

    buildSummaryBlock('Overall', participants);
    if (participants.filter(p => p.level === 'L1').length) buildSummaryBlock('L1', participants.filter(p => p.level === 'L1'));
    if (participants.filter(p => p.level === 'L2').length) buildSummaryBlock('L2', participants.filter(p => p.level === 'L2'));

    // --- SHEET 2: STATUS (DYNAMIC ROUND COLUMNS) ---
    const wsStatus = wbMorning.addWorksheet('Status');
    const baseCols = ['Level', 'REGION', 'MSPIN', 'DEALER_CD_FOR_CD', 'DEALER_NAME', 'CITY', 'CHANNEL', 'NAME', 'DESG', 'Trainer Name', 'Agency', 'From Time', 'To Time'];
    const tailCols = ['Total', 'Overall Total', 'Percentage', 'Attendance Status', 'Certified'];

    const baseLen = baseCols.length;
    const tailStart = baseLen + totalRoundCols + 1;
    const tailEnd = tailStart + tailCols.length - 1;

    // Column widths
    const baseWidths = [8, 8, 14, 15, 35, 15, 12, 25, 12, 22, 10, 12, 12];
    baseWidths.forEach((w, i) => { wsStatus.getColumn(i + 1).width = w; });
    for (let i = baseLen + 1; i <= tailEnd; i++) wsStatus.getColumn(i).width = 12;

    // Header row 1
    const hr1 = [...baseCols];
    roundColumnGroups.forEach(g => {
      hr1.push(g.label, ...Array(g.rounds.length - 1).fill(''));
    });
    hr1.push(...tailCols);

    wsStatus.addRow(hr1);
    wsStatus.addRow([...Array(baseLen).fill(''), ...allRoundCols, ...Array(tailCols.length).fill('')]);

    // Merge round-group headers dynamically
    let roundColStart = baseLen + 1;
    roundColumnGroups.forEach(g => {
      if (g.rounds.length > 1) {
        wsStatus.mergeCells(1, roundColStart, 1, roundColStart + g.rounds.length - 1);
      }
      roundColStart += g.rounds.length;
    });
    for (let c = 1; c <= baseLen; c++) wsStatus.mergeCells(1, c, 2, c);
    for (let c = tailStart; c <= tailEnd; c++) wsStatus.mergeCells(1, c, 2, c);

    // Header styling
    [1, 2].forEach(rowNum => {
      wsStatus.getRow(rowNum).eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { bold: true, size: 10, color: { argb: 'FF000000' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    });

    // Data rows (fully dynamic round placement)
    participants.forEach(p => {
      const rm = roundMap[p.mpin] || {};
      const pRounds = projectRounds[p.project_name] || [];

      // Only fill rounds that belong to this participant's project
      const scores = allRoundCols.map(rName =>
        pRounds.includes(rName) && rm[rName] !== undefined ? rm[rName] : ''
      );

      const total = scores.filter(v => typeof v === 'number').reduce((a, b) => a + b, 0);
      const appeared = ['Completed', 'In Progress'].includes(p.round_status);

      const row = wsStatus.addRow([
        p.level, p.region, p.mpin, p.dealer_code, p.dealer_name, p.city, p.channel,
        p.name, p.role, p.trainer_name || '—', p.agency || '—', p.time_from, p.time_to,
        ...scores, total.toFixed(2), 150, total / 150,
        appeared ? 'Appeared' : 'Not Appeared',
        appeared ? (p.cert_status === 'Pass' ? 'Yes' : 'No') : ''
      ]);

      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        if (colNum === tailStart + 2) cell.numFmt = '0%';
        if (colNum === tailStart) cell.numFmt = '0.00';
      });
      row.getCell(5).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(8).alignment = { vertical: 'middle', horizontal: 'left' };
    });

    const buffer1 = await wbMorning.xlsx.writeBuffer();

    // ==========================================
    // 3. WORKBOOK 2: ATTENDANCE REPORT (unchanged)
    // ==========================================
    const wbAttendance = new ExcelJS.Workbook();
    const wsAttendance = wbAttendance.addWorksheet('Attendance');

    wsAttendance.columns = [
      { header: 'S.N', key: 'sno', width: 8 },
      { header: 'Region', key: 'region', width: 10 },
      { header: 'Dealer_Name', key: 'dealer_name', width: 35 },
      { header: 'Dealer_Code', key: 'dealer_code', width: 15 },
      { header: 'City', key: 'city', width: 18 },
      { header: 'MSPIN', key: 'mpin', width: 15 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'JOB ROLE', key: 'role', width: 18 },
      { header: 'Level', key: 'level', width: 10 },
      { header: 'Trainer Name', key: 'trainer_name', width: 22 },
      { header: 'Agency', key: 'agency', width: 12 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'From Time', key: 'time_from', width: 12 },
      { header: 'To Time', key: 'time_to', width: 12 },
      { header: 'Attendance Status', key: 'attendance_status', width: 18 }
    ];

    const hRow = wsAttendance.getRow(1);
    hRow.height = 30;
    hRow.eachCell((cell) => {
      cell.font = { bold: true, size: 11, color: { argb: 'FF000000' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    participants.forEach((p, idx) => {
      const appeared = ['Completed', 'In Progress'].includes(p.round_status);
      const row = wsAttendance.addRow({
        sno: idx + 1, region: p.region, dealer_name: p.dealer_name, dealer_code: p.dealer_code,
        city: p.city, mpin: p.mpin, name: p.name, role: p.role, level: p.level,
        trainer_name: p.trainer_name || '—', agency: p.agency || '—', date: new Date(p.date),
        time_from: p.time_from, time_to: p.time_to, attendance_status: appeared ? 'Appeared' : 'Not Appeared'
      });
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      row.getCell('date').numFmt = 'dd-mmm-yy';
      row.getCell('dealer_name').alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell('name').alignment = { vertical: 'middle', horizontal: 'left' };
    });

    const buffer2 = await wbAttendance.xlsx.writeBuffer();

    // ==========================================
    // 4. ZIP + SEND
    // ==========================================
    const zip = new AdmZip();
    zip.addFile(`TV_Main_Round_Status_${date}.xlsx`, Buffer.from(buffer1));
    zip.addFile(`TV_Attendance_${date}.xlsx`, Buffer.from(buffer2));

    const zipBuffer = zip.toBuffer();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="TV_Reports_${date}.zip"`);
    res.send(zipBuffer);

  } catch (err) {
    console.error('[downloadBothTVReports]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.exportTVOverallAttendance = async (req, res) => {
  try {
    const projects = ['TV_DSE&EV_L1', 'TV_TL_L1', 'TV_L2'];

    // 1. Fetch all data for TV projects
    const [participants] = await pool.query(
      `SELECT 
          p.date, p.region, p.level, p.mpin, p.dealer_code, p.dealer_name, 
          p.city, p.channel, p.name, p.role AS desg, p.time_from, p.time_to,
          t.name AS trainer_name, t.agency,
          CASE 
            WHEN d.round_status IN ('Completed', 'In Progress') THEN 'Appeared'
            ELSE 'Absent'
          END AS attendance_status
       FROM participants p
       LEFT JOIN dashboard d ON d.mpin = p.mpin
       LEFT JOIN trainers t ON t.username = p.trainer_id
       WHERE p.project_name IN (?)
       ORDER BY p.date DESC, p.region, STR_TO_DATE(p.time_from, '%h:%i %p'), p.mpin`,
      [projects]
    );

    if (!participants.length) {
      return res.status(404).json({ success: false, error: 'No data found' });
    }

    const wb = new ExcelJS.Workbook();

    // ==========================================
    // SHEET 1: SUMMARY
    // ==========================================
    const wsSummary = wb.addWorksheet('Summary');

    // Extract dynamic roles
    const roles = [...new Set(participants.map(p => p.desg).filter(Boolean))].sort();
    const numRoles = roles.length;

    // Header Row 1 & 2
    const header1 = [
      'MAIN ROUND DATE', 'REGION', 
      'Mapped', ...Array(numRoles - 1).fill(''), 'Total',
      'Appeared', ...Array(numRoles - 1).fill(''), 'Total',
      'Absent', ...Array(numRoles - 1).fill(''), 'Total',
      'Appeared %'
    ];

    const header2 = [
      '', '', 
      ...roles, 'Total',
      ...roles, 'Total',
      ...roles, 'Total',
      ''
    ];

    wsSummary.addRow(header1);
    wsSummary.addRow(header2);

    // Merge Headers
    wsSummary.mergeCells('A1:A2');
    wsSummary.mergeCells('B1:B2');

    let col = 3;
    wsSummary.mergeCells(1, col, 1, col + numRoles); col += numRoles + 1; // Mapped
    wsSummary.mergeCells(1, col, 1, col + numRoles); col += numRoles + 1; // Appeared
    wsSummary.mergeCells(1, col, 1, col + numRoles); col += numRoles + 1; // Absent
    wsSummary.mergeCells(1, col, 2, col); // Appeared %

    // Style Headers
    [1, 2].forEach(rowNum => {
      const r = wsSummary.getRow(rowNum);
      r.height = 30;
      r.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { bold: true, size: 10, color: { argb: 'FF000000' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    });

    // Group Data by Date and Region
    const dateRegionGroups = [...new Set(participants.map(p => `${p.date}|${p.region}`))].sort();

    let gtMapped = Array(numRoles).fill(0), gtMappedT = 0;
    let gtApp = Array(numRoles).fill(0), gtAppT = 0;
    let gtAbs = Array(numRoles).fill(0), gtAbsT = 0;

    const summaryRows = [];

    dateRegionGroups.forEach(group => {
      const [dateStr, region] = group.split('|');
      const rRows = participants.filter(p => p.date === dateStr && p.region === region);

      const mapped = roles.map(role => rRows.filter(p => p.desg === role).length);
      const app = roles.map(role => rRows.filter(p => p.desg === role && p.attendance_status === 'Appeared').length);
      const abs = roles.map(role => rRows.filter(p => p.desg === role && p.attendance_status === 'Absent').length);

      const totMapped = mapped.reduce((a, b) => a + b, 0);
      const totApp = app.reduce((a, b) => a + b, 0);
      const totAbs = abs.reduce((a, b) => a + b, 0);

      mapped.forEach((v, i) => gtMapped[i] += v); gtMappedT += totMapped;
      app.forEach((v, i) => gtApp[i] += v); gtAppT += totApp;
      abs.forEach((v, i) => gtAbs[i] += v); gtAbsT += totAbs;

      const appPct = totMapped > 0 ? totApp / totMapped : 0;

      summaryRows.push([
        new Date(dateStr), region,
        ...mapped, totMapped,
        ...app, totApp,
        ...abs, totAbs,
        appPct
      ]);
    });

    // Grand Total Row
    const gtAppPct = gtMappedT > 0 ? gtAppT / gtMappedT : 0;
    summaryRows.push([
      'Grand Total', '',
      ...gtMapped, gtMappedT,
      ...gtApp, gtAppT,
      ...gtAbs, gtAbsT,
      gtAppPct
    ]);

    // Write Summary Data
    summaryRows.forEach((data, idx) => {
      const r = wsSummary.addRow(data);
      const isGrand = idx === summaryRows.length - 1;
      
      r.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        
        if (isGrand) cell.font = { bold: true };
        if (colNum === 1 && data[0] instanceof Date) cell.numFmt = 'dd-mmm-yy';
        
        // Format Appeared % column
        if (colNum === 3 + (numRoles + 1) * 3) {
          cell.numFmt = '0%';
        }
      });
    });

    // ==========================================
    // SHEET 2: STATUS
    // ==========================================
    const wsStatus = wb.addWorksheet('Status');

    wsStatus.columns = [
      { header: 'S.NO.', key: 'sno', width: 8 },
      { header: 'MAIN ROUND DATE', key: 'date', width: 18 },
      { header: 'Level', key: 'level', width: 8 },
      { header: 'REGION', key: 'region', width: 10 },
      { header: 'MSPIN', key: 'mpin', width: 15 },
      { header: 'DEALER_CD_FOR_CD', key: 'dealer_code', width: 18 },
      { header: 'DEALER_NAME', key: 'dealer_name', width: 40 },
      { header: 'CITY', key: 'city', width: 18 },
      { header: 'CHANNEL', key: 'channel', width: 12 },
      { header: 'NAME', key: 'name', width: 25 },
      { header: 'DESG', key: 'desg', width: 15 },
      { header: 'Trainer Name', key: 'trainer_name', width: 22 },
      { header: 'Agency', key: 'agency', width: 10 },
      { header: 'From Time', key: 'time_from', width: 12 },
      { header: 'To Time', key: 'time_to', width: 12 },
      { header: 'Attendance Status', key: 'attendance_status', width: 18 }
    ];

    const hRow = wsStatus.getRow(1);
    hRow.height = 30;
    hRow.eachCell((cell) => {
      cell.font = { bold: true, size: 10, color: { argb: 'FF000000' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    participants.forEach((p, idx) => {
      const row = wsStatus.addRow({
        sno: idx + 1,
        date: new Date(p.date),
        level: p.level,
        region: p.region,
        mpin: p.mpin,
        dealer_code: p.dealer_code,
        dealer_name: p.dealer_name,
        city: p.city,
        channel: p.channel,
        name: p.name,
        desg: p.desg,
        trainer_name: p.trainer_name || '—',
        agency: p.agency || '—',
        time_from: p.time_from,
        time_to: p.time_to,
        attendance_status: p.attendance_status
      });

      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });

      row.getCell('date').numFmt = 'dd-mmm-yy';
      row.getCell('dealer_name').alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell('name').alignment = { vertical: 'middle', horizontal: 'left' };
    });

    // ==========================================
    // 3. SEND RESPONSE
    // ==========================================
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="TV_Overall_Attendance.xlsx"');
    
    await wb.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('[exportTVOverallAttendance]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.exportTVOverallResult = async (req, res) => {
  try {
    const projects = ['TV_DSE&EV_L1', 'TV_TL_L1', 'TV_L2'];

    // 1. Fetch Participants
    const [participants] = await pool.query(
      `SELECT p.*, 
              d.round_status, d.status AS cert_status, 
              t.name AS trainer_name, t.agency
       FROM participants p
       LEFT JOIN dashboard d ON d.mpin = p.mpin
       LEFT JOIN trainers t ON t.username = p.trainer_id
       WHERE p.project_name IN (?)
       ORDER BY p.date DESC, p.region, STR_TO_DATE(p.time_from, '%h:%i %p'), p.mpin`,
      [projects]
    );

    if (!participants.length) return res.status(404).json({ success: false, error: 'No data found' });

    // 2. Fetch Round Scores
    const mpins = participants.map(p => p.mpin);
    const [rounds] = await pool.query(
      `SELECT mpin, round_name, score FROM participant_rounds WHERE mpin IN (?)`,
      [mpins]
    );

    const roundMap = {};
    rounds.forEach(r => {
      (roundMap[r.mpin] ||= {})[r.round_name] = r.score;
    });

    // 3. Fetch project_round_config (NO HARDCODED ROUNDS)
    const [configs] = await pool.query(
      `SELECT project_name, rounds FROM project_round_config WHERE project_name IN (?)`,
      [projects]
    );

    const projectRounds = {};
    configs.forEach(c => {
      const parsed = typeof c.rounds === 'string' ? JSON.parse(c.rounds) : c.rounds;
      projectRounds[c.project_name] = parsed.map(r => r.name);
    });

    // 4. Group projects that share the same round set
    const roundColumnGroups = [];
    const groupByKey = {};
    Object.entries(projectRounds).forEach(([proj, rList]) => {
      if (!rList || !rList.length) return;
      const key = rList.join('|');
      if (!groupByKey[key]) {
        groupByKey[key] = { label: [], rounds: rList };
        roundColumnGroups.push(groupByKey[key]);
      }
      groupByKey[key].label.push(proj);
    });
    roundColumnGroups.forEach(g => { g.label = g.label.join('+'); });

    const allRoundCols = roundColumnGroups.flatMap(g => g.rounds);
    const totalRoundCols = allRoundCols.length;

    const wb = new ExcelJS.Workbook();

    // ==========================================
    // SHEET 1: SUMMARY (already dynamic roles)
    // ==========================================
    const wsSummary = wb.addWorksheet('Summary');
    const roles = [...new Set(participants.map(p => p.role).filter(Boolean))].sort();

    const buildSummaryBlock = (title, data) => {
      wsSummary.addRow([title]);
      wsSummary.mergeCells(wsSummary.lastRow.number, 1, wsSummary.lastRow.number, 20);
      wsSummary.lastRow.font = { bold: true, size: 12 };

      const hr1 = [
        'REGION',
        'Mapped', ...Array(roles.length - 1).fill(''), 'Total',
        'Appeared', ...Array(roles.length - 1).fill(''), 'Total', 'Appeared %',
        'Certified', ...Array(roles.length - 1).fill(''), 'Total', 'Certified % from Appeared'
      ];
      const hr2 = [
        '',
        ...roles, 'Total',
        ...roles, 'Total', '',
        ...roles, 'Total', ''
      ];

      wsSummary.addRow(hr1);
      wsSummary.addRow(hr2);

      const startRow = wsSummary.lastRow.number - 1;
      wsSummary.mergeCells(startRow, 1, startRow + 1, 1);

      let colIdx = 2;
      wsSummary.mergeCells(startRow, colIdx, startRow, colIdx + roles.length); colIdx += roles.length + 1;
      wsSummary.mergeCells(startRow, colIdx, startRow, colIdx + roles.length); colIdx += roles.length + 1;
      wsSummary.mergeCells(startRow, colIdx, startRow + 1, colIdx); colIdx += 1;
      wsSummary.mergeCells(startRow, colIdx, startRow, colIdx + roles.length); colIdx += roles.length + 1;
      wsSummary.mergeCells(startRow, colIdx, startRow + 1, colIdx);

      [startRow, startRow + 1].forEach(rNum => {
        wsSummary.getRow(rNum).eachCell({ includeEmpty: true }, (cell) => {
          cell.font = { bold: true, size: 10, color: { argb: 'FF000000' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
      });

      const regions = [...new Set(data.map(p => p.region).filter(Boolean))].sort();

      let gtMapped = Array(roles.length).fill(0), gtMappedT = 0;
      let gtApp = Array(roles.length).fill(0), gtAppT = 0;
      let gtCert = Array(roles.length).fill(0), gtCertT = 0;

      const dataRows = [];

      regions.forEach(reg => {
        const rRows = data.filter(p => p.region === reg);
        const mapped = roles.map(role => rRows.filter(p => p.role === role).length);
        const app = roles.map(role => rRows.filter(p => p.role === role && ['Completed', 'In Progress'].includes(p.round_status)).length);
        const cert = roles.map(role => rRows.filter(p => p.role === role && p.cert_status === 'Pass').length);

        const tMap = mapped.reduce((a, b) => a + b, 0);
        const tApp = app.reduce((a, b) => a + b, 0);
        const tCert = cert.reduce((a, b) => a + b, 0);

        mapped.forEach((v, i) => gtMapped[i] += v); gtMappedT += tMap;
        app.forEach((v, i) => gtApp[i] += v); gtAppT += tApp;
        cert.forEach((v, i) => gtCert[i] += v); gtCertT += tCert;

        const appPct = tMap > 0 ? tApp / tMap : 0;
        const certPct = tApp > 0 ? tCert / tApp : null;

        dataRows.push([reg, ...mapped, tMap, ...app, tApp, appPct, ...cert, tCert, certPct]);
      });

      const gtAppPct = gtMappedT > 0 ? gtAppT / gtMappedT : 0;
      const gtCertPct = gtAppT > 0 ? gtCertT / gtAppT : null;
      dataRows.push(['Grand Total', ...gtMapped, gtMappedT, ...gtApp, gtAppT, gtAppPct, ...gtCert, gtCertT, gtCertPct]);

      dataRows.forEach((rData, idx) => {
        const r = wsSummary.addRow(rData);
        const isGrand = idx === dataRows.length - 1;

        r.eachCell({ includeEmpty: true }, (cell, c) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          if (isGrand) cell.font = { bold: true };

          const appPctIdx = 2 + (roles.length + 1) * 2;
          const certPctIdx = 2 + (roles.length + 1) * 3 + 1;

          if (c === appPctIdx) {
            if (cell.value === 0) cell.value = '#DIV/0!';
            else cell.numFmt = '0%';
          }
          if (c === certPctIdx) {
            if (cell.value === null) cell.value = '#DIV/0!';
            else cell.numFmt = '0%';
          }
        });
      });

      wsSummary.addRow([]); wsSummary.addRow([]);
    };

    buildSummaryBlock('Overall', participants);
    if (participants.filter(p => p.level === 'L1').length) buildSummaryBlock('L1', participants.filter(p => p.level === 'L1'));
    if (participants.filter(p => p.level === 'L2').length) buildSummaryBlock('L2', participants.filter(p => p.level === 'L2'));

    // ==========================================
    // SHEET 2: STATUS (DYNAMIC ROUND COLUMNS)
    // ==========================================
    const wsStatus = wb.addWorksheet('Status');

    const baseCols = [
      'S.NO.', 'MAIN ROUND DATE', 'Level', 'REGION', 'MSPIN', 'DEALER_CD_FOR_CD', 'DEALER_NAME',
      'CITY', 'CHANNEL', 'NAME', 'DESG', 'Trainer Name', 'Agency', 'From Time', 'To Time'
    ];
    const tailCols = ['Total', 'Overall Total', 'Percentage', 'Attendance Status', 'Certified'];

    const baseLen = baseCols.length;
    const tailStart = baseLen + totalRoundCols + 1;
    const tailEnd = tailStart + tailCols.length - 1;

    // Column widths
    const baseWidths = [8, 15, 8, 8, 15, 18, 35, 15, 12, 25, 12, 22, 10, 12, 12];
    baseWidths.forEach((w, i) => { wsStatus.getColumn(i + 1).width = w; });
    for (let i = baseLen + 1; i <= tailEnd; i++) wsStatus.getColumn(i).width = 12;

    // Header row 1
    const hr1 = [...baseCols];
    roundColumnGroups.forEach(g => {
      hr1.push(g.label, ...Array(g.rounds.length - 1).fill(''));
    });
    hr1.push(...tailCols);

    const hr2 = [...Array(baseLen).fill(''), ...allRoundCols, ...Array(tailCols.length).fill('')];

    wsStatus.addRow(hr1);
    wsStatus.addRow(hr2);

    // Merge round-group headers dynamically
    let roundColStart = baseLen + 1;
    roundColumnGroups.forEach(g => {
      if (g.rounds.length > 1) {
        wsStatus.mergeCells(1, roundColStart, 1, roundColStart + g.rounds.length - 1);
      }
      roundColStart += g.rounds.length;
    });
    for (let c = 1; c <= baseLen; c++) wsStatus.mergeCells(1, c, 2, c);
    for (let c = tailStart; c <= tailEnd; c++) wsStatus.mergeCells(1, c, 2, c);

    // Header styling
    [1, 2].forEach(rowNum => {
      const r = wsStatus.getRow(rowNum);
      r.height = 30;
      r.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { bold: true, size: 10, color: { argb: 'FF000000' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    });

    // Data rows (fully dynamic round placement)
    participants.forEach((p, idx) => {
      const rm = roundMap[p.mpin] || {};
      const pRounds = projectRounds[p.project_name] || [];

      const scores = allRoundCols.map(rName =>
        pRounds.includes(rName) && rm[rName] !== undefined ? rm[rName] : ''
      );

      const numeric = scores.filter(v => typeof v === 'number');
      const total = numeric.reduce((a, b) => a + b, 0);
      const overallTotal = 150; // keep legacy max; can be dynamic if config exposes per-round max
      const percentage = total / overallTotal;

      const appeared = ['Completed', 'In Progress'].includes(p.round_status);
      const attendance = appeared ? 'Appeared' : 'Not Appeared';
      const certified = appeared ? (p.cert_status === 'Pass' ? 'Yes' : 'No') : '';

      const row = wsStatus.addRow([
        idx + 1, new Date(p.date), p.level, p.region, p.mpin, p.dealer_code,
        p.dealer_name, p.city, p.channel, p.name, p.role, p.trainer_name || '—', p.agency || '—', p.time_from, p.time_to,
        ...scores,
        total.toFixed(2), overallTotal, percentage, attendance, certified
      ]);

      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        if (colNum === 2) cell.numFmt = 'dd-mmm-yy';
        if (colNum === tailStart) cell.numFmt = '0.00';
        if (colNum === tailStart + 2) cell.numFmt = '0%';
      });

      row.getCell(7).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(10).alignment = { vertical: 'middle', horizontal: 'left' };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="TV_Overall_Result.xlsx"');
    await wb.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('[exportTVOverallResult]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.exportTVWinners = async (req, res) => {
  try {
    const { level } = req.query;
    if (!level) return res.status(400).json({ success: false, error: 'Level query parameter is required (e.g., ?level=L1)' });

    const projects = ['TV_DSE&EV_L1', 'TV_TL_L1', 'TV_L2'];

    // 1. Fetch Project Round Configs (already dynamic)
    const [configs] = await pool.query(
      `SELECT project_name, rounds FROM project_round_config WHERE project_name IN (?)`,
      [projects]
    );
    const projectRounds = {};
    configs.forEach(c => {
      const parsed = typeof c.rounds === 'string' ? JSON.parse(c.rounds) : c.rounds;
      projectRounds[c.project_name] = parsed.map(r => r.name);
    });

    // 2. Fetch Participants
    const [participants] = await pool.query(
      `SELECT p.*, 
              d.round_status, d.status AS cert_status, 
              r1.total_r1 AS round1_score
       FROM participants p
       LEFT JOIN dashboard d ON d.mpin = p.mpin
       LEFT JOIN round_1 r1 ON r1.mpin = p.mpin
       WHERE p.project_name IN (?) AND p.level = ?
       ORDER BY p.region, p.role, p.mpin`,
      [projects, level]
    );

    if (!participants.length) return res.status(404).json({ success: false, error: 'No data found' });

    // 3. Fetch Round Scores
    const mpins = participants.map(p => p.mpin);
    const [rounds] = await pool.query(
      `SELECT mpin, round_name, score FROM participant_rounds WHERE mpin IN (?)`,
      [mpins]
    );
    const roundMap = {};
    rounds.forEach(r => {
      (roundMap[r.mpin] ||= {})[r.round_name] = r.score;
    });

    // 4. Process Data
    const processedData = participants.map(p => {
      const rm = roundMap[p.mpin] || {};
      const isAppeared = ['Completed', 'In Progress'].includes(p.round_status);
      const pRounds = projectRounds[p.project_name] || [];

      const total = pRounds.reduce((sum, rName) => sum + (Number(rm[rName]) || 0), 0);

      let lastRoundScore = 0;
      if (pRounds.includes('Round 3A') || pRounds.includes('Round 3B')) {
        lastRoundScore = (Number(rm['Round 3A']) || 0) + (Number(rm['Round 3B']) || 0);
      } else if (pRounds.length > 0) {
        const lastRoundName = pRounds[pRounds.length - 1];
        lastRoundScore = Number(rm[lastRoundName]) || 0;
      }

      return {
        ...p,
        isAppeared,
        total,
        lastRoundScore,
        round1_score: p.round1_score || 0,
        dob: p.dob ? new Date(p.dob) : new Date('1900-01-01'),
        rm
      };
    });

    // 5. Group by Region & Role
    const groups = {};
    processedData.forEach(p => {
      const key = `${p.region}|${p.role}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });

    // 6. Sort and Rank
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        if (a.isAppeared !== b.isAppeared) return a.isAppeared ? -1 : 1;
        if (!a.isAppeared) return a.mpin.localeCompare(b.mpin);
        if (b.total !== a.total) return b.total - a.total;
        if (b.round1_score !== a.round1_score) return b.round1_score - a.round1_score;
        if (b.lastRoundScore !== a.lastRoundScore) return b.lastRoundScore - a.lastRoundScore;
        return a.dob - b.dob;
      });

      let rank = 1;
      let lastRow = null;

      for (let i = 0; i < groups[key].length; i++) {
        const p = groups[key][i];

        if (!p.isAppeared) {
          p.winner = '';
          p.remarks = '';
          continue;
        }

        if (lastRow && lastRow.isAppeared) {
          if (p.total !== lastRow.total) rank++;
          else if (p.round1_score !== lastRow.round1_score) rank++;
          else if (p.lastRoundScore !== lastRow.lastRoundScore) rank++;
          else if (p.dob.getTime() !== lastRow.dob.getTime()) rank++;
        }

        if (rank <= 3) {
          p.winner = rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd';

          const hasDobTie = groups[key].some(other =>
            other.isAppeared && other.total === p.total && other.round1_score === p.round1_score &&
            other.lastRoundScore === p.lastRoundScore && other.dob.getTime() !== p.dob.getTime()
          );

          if (hasDobTie) {
            p.remarks = "Selected based on DOB tie-breaker as per rules when marks were equal.";
          } else {
            const hasR1Tie = groups[key].some(other =>
              other.isAppeared && other.total === p.total && other.round1_score !== p.round1_score
            );
            if (hasR1Tie) {
              p.remarks = "Selected based on Round 1 Score tie-breaker when main round marks were equal.";
            } else {
              const hasLastRoundTie = groups[key].some(other =>
                other.isAppeared && other.total === p.total && other.round1_score === p.round1_score && other.lastRoundScore !== p.lastRoundScore
              );
              if (hasLastRoundTie) {
                p.remarks = "Selected based on Last Round Score tie-breaker when main rounds and R1 were equal.";
              } else {
                p.remarks = '';
              }
            }
          }
        } else {
          p.winner = '';
          p.remarks = '';
        }
        lastRow = p;
      }
    });

    const sortedData = [];
    Object.keys(groups).sort().forEach(key => {
      sortedData.push(...groups[key]);
    });

    // ==========================================
    // 5. BUILD WORKBOOK
    // ==========================================
    const wb = new ExcelJS.Workbook();

    // ---- Summary sheet (DYNAMIC ROLES — was hardcoded) ----
    const wsSummary = wb.addWorksheet('Summary');
    const rolesList = [...new Set(processedData.map(p => p.role).filter(Boolean))].sort();
    const nRoles = rolesList.length;
    const allRegions = [...new Set(processedData.map(p => p.region))].sort();

    const hr1 = [
      'REGION', 'CONTEST LOCATION',
      'Mapped', ...Array(Math.max(nRoles - 1, 0)).fill(''), 'Total',
      'Appeared', ...Array(Math.max(nRoles - 1, 0)).fill(''), 'Total', 'Appeared %',
      'Certified', ...Array(Math.max(nRoles - 1, 0)).fill(''), 'Total', 'Certified % from Appeared'
    ];
    const hr2 = ['', '', ...rolesList, 'Total', ...rolesList, 'Total', '', ...rolesList, 'Total', ''];

    wsSummary.addRow(hr1);
    wsSummary.addRow(hr2);

    wsSummary.mergeCells('A1:A2'); wsSummary.mergeCells('B1:B2');
    let cIdx = 3;
    wsSummary.mergeCells(1, cIdx, 1, cIdx + nRoles); cIdx += nRoles + 1;
    wsSummary.mergeCells(1, cIdx, 1, cIdx + nRoles); cIdx += nRoles + 1;
    wsSummary.mergeCells(1, cIdx, 2, cIdx); cIdx += 1;
    wsSummary.mergeCells(1, cIdx, 1, cIdx + nRoles); cIdx += nRoles + 1;
    wsSummary.mergeCells(1, cIdx, 2, cIdx);

    [1, 2].forEach(r => {
      wsSummary.getRow(r).eachCell({ includeEmpty: true }, cell => {
        cell.font = { bold: true, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    });

    const gtMapped = Array(nRoles).fill(0), gtApp = Array(nRoles).fill(0), gtCert = Array(nRoles).fill(0);
    let gtMappedT = 0, gtAppT = 0, gtCertT = 0;

    // Dynamic column indices for the two percentage columns
    const appPctCol = 3 + (nRoles + 1) * 2;
    const certPctCol = 3 + (nRoles + 1) * 3 + 1;

    allRegions.forEach(reg => {
      const rRows = processedData.filter(p => p.region === reg);
      const mapped = rolesList.map(role => rRows.filter(p => p.role === role).length);
      const app = rolesList.map(role => rRows.filter(p => p.role === role && p.isAppeared).length);
      const cert = rolesList.map(role => rRows.filter(p => p.role === role && p.cert_status === 'Pass').length);

      const tMap = mapped.reduce((a, b) => a + b, 0);
      const tApp = app.reduce((a, b) => a + b, 0);
      const tCert = cert.reduce((a, b) => a + b, 0);

      mapped.forEach((v, i) => gtMapped[i] += v); gtMappedT += tMap;
      app.forEach((v, i) => gtApp[i] += v); gtAppT += tApp;
      cert.forEach((v, i) => gtCert[i] += v); gtCertT += tCert;

      const row = wsSummary.addRow([
        reg, 'Online', ...mapped, tMap, ...app, tApp, tMap > 0 ? tApp / tMap : 0, ...cert, tCert, tApp > 0 ? tCert / tApp : 0
      ]);

      row.eachCell({ includeEmpty: true }, (cell, c) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        if (c === appPctCol || c === certPctCol) cell.numFmt = '0%';
      });
    });

    const gtRow = wsSummary.addRow([
      'Grand Total', '', ...gtMapped, gtMappedT, ...gtApp, gtAppT, gtMappedT > 0 ? gtAppT / gtMappedT : 0, ...gtCert, gtCertT, gtAppT > 0 ? gtCertT / gtAppT : 0
    ]);
    gtRow.eachCell((cell, c) => {
      cell.font = { bold: true };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      if (c === appPctCol || c === certPctCol) cell.numFmt = '0%';
    });

    // ---- Individual role sheets (already fully dynamic) ----
    const uniqueRoles = [...new Set(sortedData.map(p => p.role || 'Unknown'))].sort();

    uniqueRoles.forEach(role => {
      const roleData = sortedData.filter(p => p.role === role);
      if (roleData.length === 0) return;

      const sheetName = role.replace(/[\\\/\?\*\[\]]/g, '').substring(0, 31) || 'Role';
      const wsRole = wb.addWorksheet(sheetName);

      const roleRounds = [...new Set(roleData.flatMap(p => projectRounds[p.project_name] || []))];
      roleRounds.sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || 0);
        const numB = parseInt(b.match(/\d+/)?.[0] || 0);
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b);
      });

      const dynamicColumns = [
        { header: 'S.NO.', key: 'sno', width: 8 },
        { header: 'MAIN ROUND DATE', key: 'date', width: 15 },
        { header: 'Level', key: 'level', width: 8 },
        { header: 'REGION', key: 'region', width: 10 },
        { header: 'MSPIN', key: 'mpin', width: 15 },
        { header: 'DEALER_CD_FOR_CD', key: 'dealer_code', width: 18 },
        { header: 'DEALER_NAME', key: 'dealer_name', width: 40 },
        { header: 'CITY', key: 'city', width: 15 },
        { header: 'Channel', key: 'channel', width: 12 },
        { header: 'NAME', key: 'name', width: 25 },
        { header: 'DESG', key: 'role', width: 12 },
      ];

      roleRounds.forEach(rName => {
        dynamicColumns.push({
          header: rName,
          key: rName.replace(/\s+/g, '_').toLowerCase(),
          width: 10
        });
      });

      dynamicColumns.push(
        { header: 'Total', key: 'total', width: 12 },
        { header: 'Overall Total', key: 'overall', width: 12 },
        { header: 'Attendance Status', key: 'attendance', width: 18 },
        { header: 'Certified', key: 'certified', width: 12 },
        { header: 'DOB', key: 'dob', width: 15 },
        { header: 'Last Round Score', key: 'last_round', width: 15 },
        { header: 'Round 1', key: 'r1', width: 10 },
        { header: 'Percentage', key: 'percentage', width: 12 },
        { header: 'Winners', key: 'winner', width: 10 },
        { header: 'Remarks', key: 'remarks', width: 50 }
      );

      wsRole.columns = dynamicColumns;

      const hRow = wsRole.getRow(1);
      hRow.height = 30;
      hRow.eachCell((cell) => {
        cell.font = { bold: true, size: 10, color: { argb: 'FF000000' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });

      roleData.forEach((p, idx) => {
        const total = p.total;
        const overall = 150; // legacy max; can be dynamic if config exposes per-round max
        const pct = total / overall;

        const rowData = {
          sno: idx + 1,
          date: new Date(p.date),
          level: p.level,
          region: p.region,
          mpin: p.mpin,
          dealer_code: p.dealer_code,
          dealer_name: p.dealer_name,
          city: p.city,
          channel: p.channel,
          name: p.name,
          role: p.role,
          total: total.toFixed(2),
          overall: overall,
          attendance: p.isAppeared ? 'Appeared' : 'Not Appeared',
          certified: p.cert_status === 'Pass' ? 'Yes' : 'No',
          dob: p.dob.getTime() === new Date('1900-01-01').getTime() ? '—' : p.dob,
          last_round: p.lastRoundScore,
          r1: p.round1_score,
          percentage: pct,
          winner: p.winner || '',
          remarks: p.remarks || ''
        };

        roleRounds.forEach(rName => {
          const key = rName.replace(/\s+/g, '_').toLowerCase();
          rowData[key] = p.rm[rName] !== undefined ? p.rm[rName] : '';
        });

        const row = wsRole.addRow(rowData);

        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        if (row.getCell('date').value) row.getCell('date').numFmt = 'dd-mmm-yy';
        if (row.getCell('dob').value !== '—') row.getCell('dob').numFmt = 'dd-mmm-yy';
        row.getCell('percentage').numFmt = '0.0%';

        row.getCell('dealer_name').alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell('name').alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell('remarks').alignment = { vertical: 'middle', horizontal: 'left' };
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="TV_Winners_${level}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('[exportTVWinners]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.exportTVWinnersZIP = async (req, res) => {
  try {
    const { level } = req.query;
    if (!level) return res.status(400).json({ success: false, error: 'Level query parameter is required (e.g., ?level=L1)' });

    const projects = ['TV_DSE&EV_L1', 'TV_TL_L1', 'TV_L2'];

    // 1. Fetch Project Round Configs
    const [configs] = await pool.query(
      `SELECT project_name, rounds FROM project_round_config WHERE project_name IN (?)`,
      [projects]
    );
    const projectRounds = {};
    configs.forEach(c => {
      const parsed = typeof c.rounds === 'string' ? JSON.parse(c.rounds) : c.rounds;
      projectRounds[c.project_name] = parsed.map(r => r.name);
    });

    // 2. Fetch Participants
    const [participants] = await pool.query(
      `SELECT p.*, 
              d.round_status, d.status AS cert_status, 
              r1.total_r1 AS round1_score
       FROM participants p
       LEFT JOIN dashboard d ON d.mpin = p.mpin
       LEFT JOIN round_1 r1 ON r1.mpin = p.mpin
       WHERE p.project_name IN (?) AND p.level = ?
       ORDER BY p.region, p.role, p.mpin`,
      [projects, level]
    );

    if (!participants.length) return res.status(404).json({ success: false, error: 'No data found' });

    // 3. Fetch Round Scores
    const mpins = participants.map(p => p.mpin);
    const [rounds] = await pool.query(
      `SELECT mpin, round_name, score FROM participant_rounds WHERE mpin IN (?)`,
      [mpins]
    );
    const roundMap = {};
    rounds.forEach(r => {
      (roundMap[r.mpin] ||= {})[r.round_name] = r.score;
    });

    // 4. Process Data & Ranking
    const processedData = participants.map(p => {
      const rm = roundMap[p.mpin] || {};
      const isAppeared = ['Completed', 'In Progress'].includes(p.round_status);
      
      const pRounds = projectRounds[p.project_name] || [];
      const total = pRounds.reduce((sum, rName) => sum + (Number(rm[rName]) || 0), 0);
      
      let lastRoundScore = 0;
      if (pRounds.includes('Round 3A') || pRounds.includes('Round 3B')) {
        lastRoundScore = (Number(rm['Round 3A']) || 0) + (Number(rm['Round 3B']) || 0);
      } else if (pRounds.length > 0) {
        const lastRoundName = pRounds[pRounds.length - 1];
        lastRoundScore = Number(rm[lastRoundName]) || 0;
      }
      
      return {
        ...p,
        isAppeared,
        total,
        lastRoundScore,
        round1_score: p.round1_score || 0,
        dob: p.dob ? new Date(p.dob) : new Date('1900-01-01'), 
      };
    });

    // Group by Region & Role
    const groups = {};
    processedData.forEach(p => {
      const key = `${p.region}|${p.role}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });

    // Sort and Rank
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        if (a.isAppeared !== b.isAppeared) return a.isAppeared ? -1 : 1;
        if (!a.isAppeared) return a.mpin.localeCompare(b.mpin); 

        if (b.total !== a.total) return b.total - a.total; 
        if (b.round1_score !== a.round1_score) return b.round1_score - a.round1_score; 
        if (b.lastRoundScore !== a.lastRoundScore) return b.lastRoundScore - a.lastRoundScore; 
        return a.dob - b.dob; 
      });

      let rank = 1;
      let lastRow = null;

      for (let i = 0; i < groups[key].length; i++) {
        const p = groups[key][i];
        
        if (!p.isAppeared) {
          p.winner = '';
          p.remarks = '';
          continue;
        }

        if (lastRow && lastRow.isAppeared) {
          if (p.total !== lastRow.total) rank++;
          else if (p.round1_score !== lastRow.round1_score) rank++;
          else if (p.lastRoundScore !== lastRow.lastRoundScore) rank++;
          else if (p.dob.getTime() !== lastRow.dob.getTime()) rank++;
        }
        
        if (rank <= 3) {
          p.winner = rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd';
          
          const hasDobTie = groups[key].some(other => 
            other.isAppeared && other.total === p.total && other.round1_score === p.round1_score && 
            other.lastRoundScore === p.lastRoundScore && other.dob.getTime() !== p.dob.getTime()
          );

          if (hasDobTie) {
            p.remarks = "Selected based on DOB tie-breaker as per rules when marks were equal.";
          } else {
            const hasR1Tie = groups[key].some(other => 
              other.isAppeared && other.total === p.total && other.round1_score !== p.round1_score
            );
            if (hasR1Tie) {
               p.remarks = "Selected based on Round 1 Score tie-breaker when main round marks were equal.";
            } else {
               const hasLastRoundTie = groups[key].some(other => 
                  other.isAppeared && other.total === p.total && other.round1_score === p.round1_score && other.lastRoundScore !== p.lastRoundScore
               );
               if (hasLastRoundTie) {
                 p.remarks = "Selected based on Last Round Score tie-breaker when main rounds and R1 were equal.";
               } else {
                 p.remarks = '';
               }
            }
          }
        } else {
          p.winner = '';
          p.remarks = '';
        }
        lastRow = p;
      }
    });

    // Flatten back to array
    const sortedData = [];
    Object.keys(groups).sort().forEach(key => {
      sortedData.push(...groups[key]);
    });

    // ==========================================
    // 5. BUILD EXCEL FILES
    // ==========================================
    const zip = new AdmZip();
    
    const uniqueRoles = [...new Set(processedData.map(p => p.role).filter(Boolean))].sort();
    const uniqueRegions = [...new Set(processedData.map(p => p.region).filter(Boolean))].sort();
    const numRoles = uniqueRoles.length;

    // ==========================================
    // FILE 1: GLOBAL SUMMARY
    // ==========================================
    const wbSummary = new ExcelJS.Workbook();
    const wsSummary = wbSummary.addWorksheet('Summary');
    
    // Helper to write headers (re-used for region files)
    const writeSummaryHeaders = (ws) => {
      const hr1 = [
        'REGION', 'CONTEST LOCATION', 
        'Mapped', ...Array(numRoles - 1).fill(''), 'Total', 
        'Appeared', ...Array(numRoles - 1).fill(''), 'Total', 'Appeared %', 
        'Certified', ...Array(numRoles - 1).fill(''), 'Total', 'Certified % from Appeared'
      ];
      const hr2 = ['', '', ...uniqueRoles, 'Total', ...uniqueRoles, 'Total', '', ...uniqueRoles, 'Total', ''];
      
      ws.addRow(hr1);
      ws.addRow(hr2);

      ws.mergeCells('A1:A2'); ws.mergeCells('B1:B2');
      let cIdx = 3;
      ws.mergeCells(1, cIdx, 1, cIdx + numRoles); cIdx += numRoles + 1; 
      ws.mergeCells(1, cIdx, 1, cIdx + numRoles); cIdx += numRoles + 1; 
      ws.mergeCells(1, cIdx, 2, cIdx); cIdx += 1; 
      ws.mergeCells(1, cIdx, 1, cIdx + numRoles); cIdx += numRoles + 1; 
      ws.mergeCells(1, cIdx, 2, cIdx); 

      [1, 2].forEach(r => {
        ws.getRow(r).eachCell({ includeEmpty: true }, cell => {
          cell.font = { bold: true, size: 10 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
      });
    };

    // Helper to write a summary row
    const writeSummaryRow = (ws, region, rows) => {
      const mapped = uniqueRoles.map(role => rows.filter(p => p.role === role).length);
      const app = uniqueRoles.map(role => rows.filter(p => p.role === role && p.isAppeared).length);
      const cert = uniqueRoles.map(role => rows.filter(p => p.role === role && p.cert_status === 'Pass').length);

      const tMap = mapped.reduce((a, b) => a + b, 0);
      const tApp = app.reduce((a, b) => a + b, 0);
      const tCert = cert.reduce((a, b) => a + b, 0);

      const row = ws.addRow([
        region, 'Online', ...mapped, tMap, ...app, tApp, tMap > 0 ? tApp / tMap : 0, ...cert, tCert, tApp > 0 ? tCert / tApp : 0
      ]);

      row.eachCell({ includeEmpty: true }, (cell, c) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        if (c === 3 + (numRoles + 1) * 2 || c === 3 + (numRoles + 1) * 3 + 1) cell.numFmt = '0%';
      });
    };

    writeSummaryHeaders(wsSummary);

    // Calculate Grand Totals for Global Summary
    const gtMapped = Array(numRoles).fill(0), gtApp = Array(numRoles).fill(0), gtCert = Array(numRoles).fill(0);
    let gtMappedT = 0, gtAppT = 0, gtCertT = 0;

    uniqueRegions.forEach(reg => {
      const rRows = processedData.filter(p => p.region === reg);
      writeSummaryRow(wsSummary, reg, rRows);

      // Accumulate Grand Totals
      const mapped = uniqueRoles.map(role => rRows.filter(p => p.role === role).length);
      const app = uniqueRoles.map(role => rRows.filter(p => p.role === role && p.isAppeared).length);
      const cert = uniqueRoles.map(role => rRows.filter(p => p.role === role && p.cert_status === 'Pass').length);

      mapped.forEach((v, i) => gtMapped[i] += v); gtMappedT += mapped.reduce((a, b) => a + b, 0);
      app.forEach((v, i) => gtApp[i] += v); gtAppT += app.reduce((a, b) => a + b, 0);
      cert.forEach((v, i) => gtCert[i] += v); gtCertT += cert.reduce((a, b) => a + b, 0);
    });

    // Global Grand Total Row
    const gtRow = wsSummary.addRow([
      'Grand Total', '', ...gtMapped, gtMappedT, ...gtApp, gtAppT, gtMappedT > 0 ? gtAppT / gtMappedT : 0, ...gtCert, gtCertT, gtAppT > 0 ? gtCertT / gtAppT : 0
    ]);
    gtRow.eachCell((cell, c) => {
      cell.font = { bold: true };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      if (c === 3 + (numRoles + 1) * 2 || c === 3 + (numRoles + 1) * 3 + 1) cell.numFmt = '0%';
    });

    const summaryBuffer = await wbSummary.xlsx.writeBuffer();
    zip.addFile(`Summary_${level}.xlsx`, Buffer.from(summaryBuffer));

    // ==========================================
    // FILE 2+: INDIVIDUAL REGIONS (Multi-Sheet)
    // ==========================================
    for (const region of uniqueRegions) {
      const regionData = sortedData.filter(p => p.region === region);

      const wbRegion = new ExcelJS.Workbook();

      // --- SHEET 1: REGION SUMMARY ---
      const wsRegionSummary = wbRegion.addWorksheet('Summary');
      writeSummaryHeaders(wsRegionSummary);
      writeSummaryRow(wsRegionSummary, region, regionData); // Just 1 row for this region
      
      // Add Grand Total for the region (acts as total for the sheet)
      const mapped = uniqueRoles.map(role => regionData.filter(p => p.role === role).length);
      const app = uniqueRoles.map(role => regionData.filter(p => p.role === role && p.isAppeared).length);
      const cert = uniqueRoles.map(role => regionData.filter(p => p.role === role && p.cert_status === 'Pass').length);
      
      const tMap = mapped.reduce((a, b) => a + b, 0);
      const tApp = app.reduce((a, b) => a + b, 0);
      const tCert = cert.reduce((a, b) => a + b, 0);
      
      const regGtRow = wsRegionSummary.addRow([
        'Region Total', '', ...mapped, tMap, ...app, tApp, tMap > 0 ? tApp / tMap : 0, ...cert, tCert, tApp > 0 ? tCert / tApp : 0
      ]);
      regGtRow.eachCell((cell, c) => {
        cell.font = { bold: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        if (c === 3 + (numRoles + 1) * 2 || c === 3 + (numRoles + 1) * 3 + 1) cell.numFmt = '0%';
      });

      // --- SHEETS 2+: INDIVIDUAL ROLES ---
      const regionRoles = [...new Set(regionData.map(p => p.role).filter(Boolean))].sort();
      
      regionRoles.forEach(role => {
        const roleData = regionData.filter(p => p.role === role);
        if (roleData.length === 0) return;

        const wsRole = wbRegion.addWorksheet(role);

        // Exact columns requested for the role data
        wsRole.columns = [
          { header: 'S.NO.', key: 'sno', width: 8 },
          { header: 'MAIN ROUND DATE', key: 'date', width: 15 },
          { header: 'Level', key: 'level', width: 8 },
          { header: 'REGION', key: 'region', width: 10 },
          { header: 'MSPIN', key: 'mpin', width: 15 },
          { header: 'DEALER_CD_FOR_CD', key: 'dealer_code', width: 18 },
          { header: 'DEALER_NAME', key: 'dealer_name', width: 40 },
          { header: 'CITY', key: 'city', width: 15 },
          { header: 'Channel', key: 'channel', width: 12 },
          { header: 'NAME', key: 'name', width: 25 },
          { header: 'DESG', key: 'role', width: 12 },
          { header: 'Certified', key: 'certified', width: 12 },
          { header: 'Winners', key: 'winner', width: 10 },
          { header: 'Remarks', key: 'remarks', width: 50 }
        ];

        const hRow = wsRole.getRow(1);
        hRow.height = 30;
        hRow.eachCell((cell) => {
          cell.font = { bold: true, size: 10, color: { argb: 'FF000000' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        roleData.forEach((p, idx) => {
          const row = wsRole.addRow({
            sno: idx + 1,
            date: new Date(p.date),
            level: p.level,
            region: p.region,
            mpin: p.mpin,
            dealer_code: p.dealer_code,
            dealer_name: p.dealer_name,
            city: p.city,
            channel: p.channel,
            name: p.name,
            role: p.role,
            certified: p.isAppeared ? (p.cert_status === 'Pass' ? 'Yes' : 'No') : 'Not Appeared',
            winner: p.winner || '',
            remarks: p.remarks || ''
          });

          row.eachCell({ includeEmpty: true }, (cell) => {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          });

          if (row.getCell('date').value) row.getCell('date').numFmt = 'dd-mmm-yy';
          
          // Left align long text
          row.getCell('dealer_name').alignment = { vertical: 'middle', horizontal: 'left' };
          row.getCell('name').alignment = { vertical: 'middle', horizontal: 'left' };
          row.getCell('remarks').alignment = { vertical: 'middle', horizontal: 'left' };
        });
      });

      const regionBuffer = await wbRegion.xlsx.writeBuffer();
      zip.addFile(`Region_${region}_${level}.xlsx`, Buffer.from(regionBuffer));
    }

    // ==========================================
    // 6. SEND ZIP RESPONSE
    // ==========================================
    const zipBuffer = zip.toBuffer();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="TV_Winners_${level}.zip"`);
    res.send(zipBuffer);

  } catch (err) {
    console.error('[exportTVWinnersZIP]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getTVFilters = async (req, res) => {
  try {
    const projects = ['TV_DSE&EV_L1', 'TV_TL_L1', 'TV_L2'];
    
    const [dates] = await pool.query(
      `SELECT DISTINCT date FROM participants WHERE project_name IN (?) ORDER BY date DESC`,
      [projects]
    );
    
    const [levels] = await pool.query(
      `SELECT DISTINCT level FROM participants WHERE project_name IN (?) ORDER BY level`,
      [projects]
    );
    
    res.json({
      success: true,
      dates: dates.map(d => d.date),
      levels: levels.map(l => l.level).filter(Boolean)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};



exports.downloadRound1Sample = async (req, res) => {
  try {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Round 1 Template');

    ws.columns = [
      { header: 'ROUND 1 DATE', key: 'date', width: 18 },
      { header: 'Level', key: 'level', width: 10 },
      { header: 'REGION', key: 'region', width: 10 }, // Added after Level
      { header: 'Project Name', key: 'project_name', width: 20 },
      { header: 'MSPIN', key: 'mpin', width: 15 },
      { header: 'DEALER CODE', key: 'dealer_code', width: 15 },
      { header: 'Dealer City', key: 'city', width: 18 },
      { header: 'DEALER NAME', key: 'dealer_name', width: 35 },
      { header: 'NAME', key: 'name', width: 25 },
      { header: 'Role', key: 'role', width: 18 },
      { header: 'Appeared Status', key: 'appeared_status', width: 18 },
      { header: 'Product', key: 'Product', width: 12 },
      { header: 'Advance Technology', key: 'Advance Technology', width: 20 },
      { header: 'VAS', key: 'VAS', width: 10 },
      { header: 'Soft Skills', key: 'Soft Skills', width: 12 },
      { header: 'Total-R1', key: 'total_r1', width: 12 },
      { header: 'Result', key: 'result', width: 15 } 
    ];

    const headerRow = ws.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, color: { argb: 'FF000000' } };
      if (colNumber > 11 && colNumber < 16) {
         cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } }; 
      } else {
         cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
      }
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    ws.addRow({
      date: '18-Sep-26', level: 'L1', region: 'C1', project_name: 'Arena L1',
      mpin: '730347', dealer_code: '08D6-08', city: 'DELHI', dealer_name: 'RANA MOTORS PVT LTD', 
      name: 'ASHISH SALUJA', role: 'Sales Captain', appeared_status: 'Appeared',
      Product: 24, 'Advance Technology': 2, VAS: 2, 'Soft Skills': 2, total_r1: 30, result: 'Pass'
    });

    // Dropdown for Appeared Status
    ws.dataValidations.add('K2:K5000', {
      type: 'list', allowBlank: false,
      formulae: ['"Appeared,Not Appeared"']
    });

    // Dropdown for Result
    ws.dataValidations.add('Q2:Q5000', {
      type: 'list', allowBlank: true,
      formulae: ['"Pass,Fail"']
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Round_1_Template.xlsx"');
    
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.importRound1 = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Excel file required' });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(req.file.buffer);
    const ws = wb.worksheets[0];
    
    const baseHeaders = [
      'round 1 date', 'level', 'region', 'project name', 'mspin', 'dealer code', 
      'dealer city', 'dealer name', 'name', 'role', 'appeared status', 'total-r1', 'result'
    ];
    
    const headerMap = {};
    const dynamicCategories = [];

    ws.getRow(1).eachCell((cell, colNumber) => {
      if (!cell.value) return;
      const headerName = String(cell.value).trim();
      const lowerHeader = headerName.toLowerCase();

      if (baseHeaders.includes(lowerHeader)) {
        headerMap[lowerHeader] = colNumber;
      } else {
        headerMap[lowerHeader] = colNumber;
        dynamicCategories.push({ name: headerName, col: colNumber });
      }
    });

    const updates = [];

    ws.eachRow((row, rowNo) => {
      if (rowNo === 1) return;

      const getValue = (headerName) => {
        const col = headerMap[headerName.toLowerCase()];
        return col ? row.getCell(col).value : null;
      };

      const mpin = String(getValue('MSPIN') || '').trim();
      if (!mpin) return;

      const rawDate = getValue('ROUND 1 DATE');
      let dateVal = null;
      if (rawDate instanceof Date) dateVal = rawDate.toISOString().slice(0, 10);
      else if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d)) dateVal = d.toISOString().slice(0, 10);
      }

      const project_name = String(getValue('Project Name') || '').trim();
      const level = String(getValue('Level') || '').trim();
      const region = String(getValue('Region') || '').trim();
      const dealer_code = String(getValue('DEALER CODE') || '').trim();
      const city = String(getValue('Dealer City') || '').trim();
      const dealer_name = String(getValue('DEALER NAME') || '').trim();
      const role = String(getValue('Role') || '').trim();
      
      const status = String(getValue('Appeared Status') || '').trim();
      const appeared_status = status === 'Appeared' ? 'Appeared' : 'Not Appeared';
      
      let result = String(getValue('Result') || '').trim();
      if (!['Pass', 'Fail'].includes(result)) {
        result = null; 
      }

      const rawTotalR1 = getValue('Total-R1');
      let total_r1 = null;
      if (rawTotalR1 !== null && rawTotalR1 !== '') {
        total_r1 = Number(rawTotalR1);
      }

      let category_score = null;
      if (appeared_status === 'Appeared' && dynamicCategories.length > 0) {
        const scoreObj = {};
        dynamicCategories.forEach(cat => {
          const scoreVal = Number(row.getCell(cat.col).value) || 0;
          scoreObj[cat.name] = scoreVal;
        });
        category_score = JSON.stringify(scoreObj); 
      }

      updates.push({
        mpin, project_name, level, region, dateVal, dealer_code, city, 
        dealer_name, role, appeared_status, category_score, total_r1, result
      });
    });

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid data found' });
    }

    let insertedCount = 0;
    let updatedCount = 0;

    // Loop through records and check if they exist
    for (const r of updates) {
      const [existing] = await pool.query(
        `SELECT mpin FROM round_1 WHERE mpin = ? LIMIT 1`,
        [r.mpin]
      );

      if (existing.length > 0) {
        // --- UPDATE ---
        await pool.query(
          `UPDATE round_1 SET
             project_name = ?, level = ?, region = ?, round_1_date = ?,
             dealer_code = ?, city = ?, dealer_name = ?, role = ?,
             appeared_status = ?, category_score = ?, total_r1 = ?, result = ?
           WHERE mpin = ?`,
          [
            r.project_name, r.level, r.region, r.dateVal, 
            r.dealer_code, r.city, r.dealer_name, r.role, 
            r.appeared_status, r.category_score, r.total_r1, r.result,
            r.mpin
          ]
        );
        updatedCount++;
      } else {
        // --- INSERT ---
        await pool.query(
          `INSERT INTO round_1 
             (mpin, project_name, level, region, round_1_date, dealer_code, city, dealer_name, role, appeared_status, category_score, total_r1, result)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            r.mpin, r.project_name, r.level, r.region, r.dateVal, 
            r.dealer_code, r.city, r.dealer_name, r.role, 
            r.appeared_status, r.category_score, r.total_r1, r.result
          ]
        );
        insertedCount++;
      }
    }

    res.json({ 
      success: true, 
      message: `Import complete: ${insertedCount} inserted, ${updatedCount} updated.`,
      total: updates.length
    });

  } catch (err) {
    console.error('[importRound1]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.downloadMainRoundTemplate = async (req, res) => {
  try {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Rounds Import');

    ws.columns = [
      { header: 'S.NO.', key: 'sno', width: 8 },
      { header: 'MSPIN', key: 'mpin', width: 15 },
      { header: 'Round Name', key: 'round_name', width: 20 },
      { header: 'Trainer Username', key: 'trainer_id', width: 20 },
      { header: 'Start Time', key: 'start_time', width: 22 },
      { header: 'End Time', key: 'end_time', width: 22 },
      { header: 'Score', key: 'score', width: 10 },
      { header: 'Trainer Name', key: 'trainer_name', width: 25 },
      { header: 'Agency', key: 'agency', width: 15 }
    ];

    // --- HEADER STYLING ---
    const headerRow = ws.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FF000000' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    // --- FORCE TIME COLUMNS TO TEXT FORMAT ---
    // This prevents Excel from auto-converting the dates
    ws.getColumn(5).numFmt = '@'; // Start Time
    ws.getColumn(6).numFmt = '@'; // End Time

    // --- ADD SAMPLE ROW ---
    ws.addRow({
      sno: 1,
      mpin: '1341632',
      round_name: 'Round 2A',
      trainer_id: 'Hmmanand',
      start_time: '2026-09-15 21:23:15',
      end_time: '2026-09-15 21:42:15',
      score: 30,
      trainer_name: 'Anand Mani',
      agency: 'HMM'
    });

    // Style the sample row
    ws.getRow(2).eachCell((cell) => {
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Participant_Rounds_Template.xlsx"');
    
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('[downloadTemplate]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.importMainRoundRecords = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Excel file required' });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(req.file.buffer);
    const ws = wb.worksheets[0];
    
    const headerMap = {};
    ws.getRow(1).eachCell((cell, colNumber) => {
      if (cell.value) headerMap[String(cell.value).trim().toLowerCase()] = colNumber;
    });

    const roundsData = [];
    const uniqueTrainers = new Map(); 
    const dateUpdates = new Set(); // <-- Short & Simple: Store "mpin|YYYY-MM-DD"

    const formatDateTime = (val) => {
      if (!val) return null;
      let d = val instanceof Date ? val : new Date(val);
      if (isNaN(d)) return String(val).trim(); 
      const pad = (num) => String(num).padStart(2, '0');
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
    };

    // 1. Parse Data
    ws.eachRow((row, rowNo) => {
      if (rowNo === 1) return;

      const getValue = (headerName) => {
        const col = headerMap[headerName.toLowerCase()];
        return col ? row.getCell(col).value : null;
      };

      const mpin = String(getValue('MSPIN') || '').trim();
      const round_name = String(getValue('Round Name') || '').trim();
      const trainer_id = String(getValue('Trainer Username') || '').trim();
      
      if (!mpin || !round_name || !trainer_id) return;

      const start_time = formatDateTime(getValue('Start Time'));
      const end_time = formatDateTime(getValue('End Time'));
      const score = (getValue('Score') !== null && getValue('Score') !== '') ? Number(getValue('Score')) : null;

      roundsData.push([mpin, trainer_id, round_name, start_time, score, end_time]);

      // --- NEW: Collect unique date updates safely ---
      if (start_time) {
        dateUpdates.add(`${mpin}|${start_time.slice(0, 10)}`);
      }
      // ------------------------------------------------

      if (!uniqueTrainers.has(trainer_id)) {
        const tName = String(getValue('Trainer Name') || '').trim() || trainer_id; 
        const tAgency = String(getValue('Agency') || '').trim() || null;
        uniqueTrainers.set(trainer_id, { name: tName, agency: tAgency });
      }
    });

    if (roundsData.length === 0) return res.status(400).json({ success: false, error: 'No data' });

    // 2. Insert/Update Trainers (Bulk)
    const trainerValues = Array.from(uniqueTrainers.entries()).map(([u, i]) => [u, i.name, i.agency, 'active']);
    if (trainerValues.length > 0) {
      await pool.query(`INSERT IGNORE INTO trainers (username, name, agency, status) VALUES ?`, [trainerValues]);
    }

    // 3. Insert Rounds (Bulk)
    await pool.query(`INSERT INTO participant_rounds (mpin, trainer_id, round_name, start_time, score, end_time) VALUES ?`, [roundsData]);

    // 4. Update Dates (Simple Loop)
    for (const item of dateUpdates) {
      const [m, d] = item.split('|');
      await pool.query(`UPDATE participants SET date = ? WHERE mpin = ? AND DATE(date) != ?`, [d, m, d]);
    }

    res.json({ success: true, message: `Imported ${roundsData.length} rounds.` });

  } catch (err) {
    console.error('[importMainRoundRecords]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};