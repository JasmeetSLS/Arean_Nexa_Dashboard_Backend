const pool     = require('../../config/db');
const ExcelJS = require('exceljs');

exports.exportArenaMorning = async (req, res) => {
  try {
    const { project, date } = req.query;

    if (!project || !date) {
      return res.status(400).json({ success: false, error: 'Project and Date are required' });
    }

    // 1. Fetch Data
    const [rows] = await pool.query(
      `SELECT
          ROW_NUMBER() OVER (ORDER BY STR_TO_DATE(p.time_from, '%h:%i %p'), p.mpin) AS sno,
          p.date, p.region, p.mpin, p.dealer_code, p.city AS dealer_city,
          p.dealer_name, p.name, p.role AS eligible,
          COALESCE(t.name, '—') AS trainer_name, COALESCE(t.agency, '—') AS agency,
          p.time_from, p.time_to,
          CASE
            WHEN p.time_to IS NULL OR p.time_to = '' THEN 'No'
            WHEN TIMESTAMP(p.date, STR_TO_DATE(p.time_to, '%h:%i %p')) <= NOW() THEN 'Yes'
            ELSE 'No'
          END AS time_slot_completed,
          CASE
            WHEN d.round_status IN ('Completed','In Progress') THEN 'Appeared'
            ELSE 'Not Appeared'
          END AS appeared_status,
          CASE WHEN d.status = 'Pass' THEN 'Yes' ELSE 'No' END AS certified_status
        FROM participants p
        LEFT JOIN dashboard d ON d.mpin = p.mpin
        LEFT JOIN trainers t ON t.username = p.trainer_id  -- CHANGED TO p.trainer_id
       WHERE p.project_name = ? AND p.date = ?
       ORDER BY STR_TO_DATE(p.time_from, '%h:%i %p'), p.mpin`,
      [project, date]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No data found' });
    }

    const roles = [...new Set(rows.map(r => r.eligible).filter(Boolean))].sort();
    const numRoles = roles.length;

    const slotColors = [
      'FFF4B084', 'FFC6E0B4', 'FFBDD7EE', 'FFFFE699', 
      'FFD9D2E9', 'FFF8CBAD', 'FFB4C6E7', 'FFE2EFDA'
    ];
    const uniqueSlots = [...new Set(rows.map(r => r.time_from))].filter(Boolean);
    const slotColorMap = {};
    uniqueSlots.forEach((slot, index) => {
      slotColorMap[slot] = slotColors[index % slotColors.length];
    });

    const wb = new ExcelJS.Workbook();

    // SHEET 1: SUMMARY
    const wsSummary = wb.addWorksheet('Summary');

    const header1 = [
      'MAIN ROUND DATE', 'REGION', 
      'Mapped', ...Array(numRoles).fill(''),
      'Expected Attendance as per Last Time Slots', ...Array(numRoles).fill(''),
      'Appeared', ...Array(numRoles).fill(''),
      'Certified', ...Array(numRoles).fill(''),
      'Appeared %(As per Slots)', 'Appeared % (as per Mapped)', 
      'Certified %', ...Array(numRoles).fill('')
    ];

    const header2 = [
      'DATE', '', 
      ...roles, 'Total',
      ...roles, 'Total',
      ...roles, 'Total',
      ...roles, 'Total',
      '', '', 
      ...roles, 'Total'
    ];

    wsSummary.addRow(header1);
    wsSummary.addRow(header2);

    wsSummary.mergeCells('A1:A2');
    wsSummary.mergeCells('B1:B2');
    
    let col = 3;
    wsSummary.mergeCells(1, col, 1, col + numRoles); col += numRoles + 1; 
    wsSummary.mergeCells(1, col, 1, col + numRoles); col += numRoles + 1; 
    wsSummary.mergeCells(1, col, 1, col + numRoles); col += numRoles + 1; 
    wsSummary.mergeCells(1, col, 1, col + numRoles); col += numRoles + 1; 
    wsSummary.mergeCells(1, col, 2, col); col += 1; 
    wsSummary.mergeCells(1, col, 2, col); col += 1; 
    wsSummary.mergeCells(1, col, 1, col + numRoles); 

    [1, 2].forEach(rowNum => {
      const r = wsSummary.getRow(rowNum);
      r.height = 35; 
      r.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { bold: true, size: 11, color: { argb: 'FF000000' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    });

    const regions = [...new Set(rows.map(r => r.region))].sort();
    let gtMapped = Array(numRoles).fill(0), gtMappedT = 0;
    let gtExp = Array(numRoles).fill(0), gtExpT = 0;
    let gtApp = Array(numRoles).fill(0), gtAppT = 0;
    let gtCert = Array(numRoles).fill(0), gtCertT = 0;

    const summaryRows = [];

    regions.forEach(region => {
      const rRows = rows.filter(r => r.region === region);
      
      const mapped = roles.map(role => rRows.filter(r => r.eligible === role).length);
      const expected = roles.map(role => rRows.filter(r => r.eligible === role && r.time_slot_completed === 'Yes').length);
      const appeared = roles.map(role => rRows.filter(r => r.eligible === role && r.appeared_status === 'Appeared').length);
      const certified = roles.map(role => rRows.filter(r => r.eligible === role && r.certified_status === 'Yes').length);

      const totMapped = mapped.reduce((a, b) => a + b, 0);
      const totExp = expected.reduce((a, b) => a + b, 0);
      const totApp = appeared.reduce((a, b) => a + b, 0);
      const totCert = certified.reduce((a, b) => a + b, 0);

      mapped.forEach((v, i) => gtMapped[i] += v); gtMappedT += totMapped;
      expected.forEach((v, i) => gtExp[i] += v); gtExpT += totExp;
      appeared.forEach((v, i) => gtApp[i] += v); gtAppT += totApp;
      certified.forEach((v, i) => gtCert[i] += v); gtCertT += totCert;

      summaryRows.push([
        rRows[0].date ? new Date(rRows[0].date) : null, region,
        ...mapped, totMapped,
        ...expected, totExp,
        ...appeared, totApp,
        ...certified, totCert,
        totExp > 0 ? totApp / totExp : 0,
        totMapped > 0 ? totApp / totMapped : 0,
        ...appeared.map((app, i) => app > 0 ? certified[i] / app : 0), totApp > 0 ? totCert / totApp : 0
      ]);
    });

    summaryRows.push([
      'Grand Total', '',
      ...gtMapped, gtMappedT,
      ...gtExp, gtExpT,
      ...gtApp, gtAppT,
      ...gtCert, gtCertT,
      gtExpT > 0 ? gtAppT / gtExpT : 0,
      gtMappedT > 0 ? gtAppT / gtMappedT : 0,
      ...gtApp.map((app, i) => app > 0 ? gtCert[i] / app : 0), gtAppT > 0 ? gtCertT / gtAppT : 0
    ]);

    summaryRows.forEach((data, idx) => {
      const r = wsSummary.addRow(data);
      const isGrand = idx === summaryRows.length - 1;
      
      r.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        if (isGrand) cell.font = { bold: true };
        
        if (colNum === 1 && data[0] instanceof Date) cell.numFmt = 'dd-mmm-yy';
        if (colNum > 2 + (numRoles + 1) * 4) cell.numFmt = '0%';
      });
    });

    // SHEET 2: STATUS
    const wsStatus = wb.addWorksheet('Status');

    wsStatus.columns = [
      { header: 'S.NO.', key: 'sno', width: 7 },
      { header: 'MAIN ROUND DATE', key: 'date', width: 18 },
      { header: 'REGION', key: 'region', width: 10 },
      { header: 'MSPIN', key: 'mpin', width: 12 },
      { header: 'DEALER CODE', key: 'dealer_code', width: 15 },
      { header: 'Dealer City', key: 'dealer_city', width: 18 },
      { header: 'DEALER NAME', key: 'dealer_name', width: 35 },
      { header: 'NAME', key: 'name', width: 30 },
      { header: 'Eligible', key: 'eligible', width: 16 },
      { header: 'Trainer Name', key: 'trainer_name', width: 22 },
      { header: 'Agency', key: 'agency', width: 10 },
      { header: 'Time From', key: 'time_from', width: 12 },
      { header: 'Time To', key: 'time_to', width: 12 },
      { header: 'Time Slots Completed', key: 'time_slot_completed', width: 22 },
      { header: 'Appeared Status', key: 'appeared_status', width: 18 },
      { header: 'Certified Status', key: 'certified_status', width: 18 },
    ];

    const hRow = wsStatus.getRow(1);
    hRow.height = 30; 
    hRow.eachCell((cell) => {
      cell.font = { bold: true, size: 11, color: { argb: 'FF000000' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    rows.forEach(r => {
      const row = wsStatus.addRow(r);
      const rowColor = slotColorMap[r.time_from] || 'FFFFFFFF';

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

        if (colNumber === 12 || colNumber === 13) {
          if (rowColor !== 'FFFFFFFF') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowColor } };
          }
        }
      });

      row.getCell('dealer_name').alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell('name').alignment = { vertical: 'middle', horizontal: 'left' };

      if (row.getCell('date').value) row.getCell('date').numFmt = 'dd-mmm-yy';
      row.getCell('time_from').numFmt = '@'; 
      row.getCell('time_to').numFmt = '@';
    });

    const safeProject = String(project).replace(/[^a-z0-9]+/gi, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Summary_${safeProject}_${date}.xlsx"`);

    await wb.xlsx.write(res);
    res.end();
    
  } catch (err) {
    console.error('[exportArenaMorning]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.exportArenaAttendance = async (req, res) => {
  try {
    // 1. Fetch Data
    const [rows] = await pool.query(
      `SELECT 
          p.level, p.region, p.mpin, p.dealer_code, p.city AS dealer_city, 
          p.dealer_name, p.name, p.role AS eligible, p.date, p.time_from, p.time_to,
          COALESCE(t.agency, '—') AS agency,
          COALESCE(t.name, '—') AS faculty,
          COALESCE(t.base_location, '—') AS base_location,
          CASE 
            WHEN d.round_status IN ('Completed', 'In Progress') THEN 'Appeared'
            WHEN TIMESTAMP(p.date, STR_TO_DATE(p.time_to, '%h:%i %p')) >= NOW() THEN 'Pending'
            ELSE 'Absent'
          END AS attendance_status
       FROM participants p
       LEFT JOIN dashboard d ON d.mpin = p.mpin
       LEFT JOIN trainers t ON t.username = p.trainer_id
       WHERE p.project_name IN ('Arena L1', 'Arena L2')
       ORDER BY p.date DESC, STR_TO_DATE(p.time_from, '%h:%i %p'), p.mpin`
    );

    if (!rows.length) return res.status(404).json({ success: false, error: 'No data found' });

    // 2. Time Slot Colors
    const colors = ['FFF4B084', 'FFC6E0B4', 'FFBDD7EE', 'FFFFE699', 'FFD9D2E9', 'FFF8CBAD', 'FFB4C6E7', 'FFE2EFDA'];
    const uniqueSlots = [...new Set(rows.map(r => r.time_from))].filter(Boolean);
    const slotColorMap = {};
    uniqueSlots.forEach((slot, i) => {
      slotColorMap[slot] = colors[i % colors.length];
    });

    const wb = new ExcelJS.Workbook();

    // 3. Build Sheet Function
    const buildSheet = (sheetName, data) => {
      const ws = wb.addWorksheet(sheetName);
      
      ws.columns = [
        { header: 'S.NO.', key: 'sno', width: 8 },
        { header: 'Level', key: 'level', width: 8 },
        { header: 'REGION', key: 'region', width: 10 },
        { header: 'MSPIN', key: 'mpin', width: 14 },
        { header: 'DEALER CODE', key: 'dealer_code', width: 15 },
        { header: 'Dealer City', key: 'dealer_city', width: 18 },
        { header: 'DEALER NAME', key: 'dealer_name', width: 45 },
        { header: 'NAME', key: 'name', width: 25 },
        { header: 'Eligible', key: 'eligible', width: 18 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Agency', key: 'agency', width: 12 },
        { header: 'Faculty', key: 'faculty', width: 22 },
        { header: 'Base location', key: 'base_location', width: 22 },
        { header: 'Time From', key: 'time_from', width: 12 },
        { header: 'Time To', key: 'time_to', width: 12 },
        { header: 'Attendance Status', key: 'attendance_status', width: 18 }
      ];

      // Simple Gray Header
      const hRow = ws.getRow(1);
      hRow.height = 30;
      hRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FF000000' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } }; // GRAY COLOR
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });

      // Data Rows
      data.forEach((r, index) => {
        const row = ws.addRow({
          sno: index + 1,
          ...r,
          date: new Date(r.date) 
        });

        const rowColor = slotColorMap[r.time_from] || 'FFFFFFFF';

        // Apply borders, alignment, and colors in one loop
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

          // Apply color ONLY to Time From (14) and Time To (15)
          if ((colNumber === 14 || colNumber === 15) && rowColor !== 'FFFFFFFF') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowColor } };
          }
        });

        // Formatting
        row.getCell('date').numFmt = 'dd-mmm-yy';
        row.getCell('dealer_name').alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell('name').alignment = { vertical: 'middle', horizontal: 'left' };
      });
    };

    // 4. Create the two sheets
    buildSheet('L1_Eligible', rows.filter(r => r.level === 'L1'));
    buildSheet('L2_Eligible', rows.filter(r => r.level === 'L2'));

    // 5. Send Response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Arena_Attendance.xlsx"');
    
    await wb.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('[exportArenaAttendance]', err);
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
          p.date AS main_round_date,   -- CHANGED TO USE p.date directly
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

    const parsedWinnerData = winnerData.map(r => {
      const isAppeared = ['Completed', 'In Progress'].includes(r.main_round_status);
      let scoreObj = {};
      if (isAppeared && r.category_score) {
        try { scoreObj = typeof r.category_score === 'string' ? JSON.parse(r.category_score) : r.category_score; } catch (e) {}
      }

      const row = {
        ...r,
        isAppeared,
        main_round: Number(r.main_round) || 0, 
        total_r1: isAppeared ? (Number(r.total_r1) || 0) : 0,
      };

      dynamicCategories.forEach(cat => {
        row[cat] = (isAppeared && scoreObj[cat] !== undefined) ? Number(scoreObj[cat]) : 0;
      });

      return row;
    });

    parsedWinnerData.sort((a, b) => {
      if (a.region !== b.region) return a.region.localeCompare(b.region);
      if (a.eligible !== b.eligible) return a.eligible.localeCompare(b.eligible);
      
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
            if (lastRow[cat] !== row[cat]) {
              isTie = false;
              break;
            }
          }
        }

        if (!isTie) {
          currentTier++;
        }
      }
      
      row.Rank = currentTier <= 3 ? currentTier : '';
      lastRow = row;
    });

    // ==========================================
    // SHEET 1: SUMMARY
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
    for(let i=0; i<5; i++) { wsSummary.mergeCells(1, col, 1, col + numRoles); col += numRoles + 1; }
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
        region, ...eligR1, totEligR1, ...appR1, totAppR1, ...eligMain, totEligMain,
        ...appMain, totAppMain, ...certMain, totCert, totAppMain > 0 ? totCert / totAppMain : 0, totEligR1 > 0 ? totCert / totEligR1 : 0
      ]);
    });

    summaryRows.push([
      'Grand Total', ...gt[0], gtT[0], ...gt[1], gtT[1], ...gt[2], gtT[2], ...gt[3], gtT[3], ...gt[4], gtT[4],
      gtT[3] > 0 ? gtT[4] / gtT[3] : 0, gtT[0] > 0 ? gtT[4] / gtT[0] : 0
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
    // SHEET 2: WINNER SUMMARY (With Rank)
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
      { header: 'Main Round Score', key: 'main_round', width: 16 },
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
        region: r.region, mpin: r.mpin, dealer_code: r.dealer_code, dealer_city: r.dealer_city,
        dealer_name: r.dealer_name, name: r.name, eligible: r.eligible,
        appeared_status: r.isAppeared ? 'Appeared' : 'Not Appeared',
        total_r1: r.isAppeared ? r.total_r1 : 0,
        main_round: r.main_round,
        certified_status: r.cert_status === 'Pass' ? 'Yes' : 'No',
        rank: r.Rank
      };

      dynamicCategories.forEach(cat => {
        rowData[cat] = r.isAppeared ? (r[cat] || '') : '';
      });

      const row = wsWinner.addRow(rowData);

      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });

      if (row.getCell('date').value) row.getCell('date').numFmt = 'dd-mmm-yy';
      row.getCell('dealer_name').alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell('name').alignment = { vertical: 'middle', horizontal: 'left' };
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

exports.exportTVMorning = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, error: 'Date is required' });

    const projects = ['TV_DSE&EV_L1', 'TV_TL&CCM_L1', 'TV_L2'];

    // ==========================================
    // 1. SIMPLE QUERIES
    // ==========================================
    
    // A. Fetch Round Configs (to get dynamic round names)
    const [configs] = await pool.query(
      `SELECT project_name, rounds FROM project_round_config WHERE project_name IN (?) AND status = 'active'`,
      [projects]
    );

    // Sort rounds into the two requested groups
    const group1Rounds = new Set(); // TV_TL&CCM_L1 + TV_L2 (Round 2, 3, 4)
    const group2Rounds = new Set(); // TV_TL&CCM_L1 (Round 2A...3B)
    
    configs.forEach(c => {
      const rounds = typeof c.rounds === 'string' ? JSON.parse(c.rounds) : c.rounds;
      if (c.project_name === 'TV_TL&CCM_L1') {
        rounds.forEach(r => group2Rounds.add(r.name));
      } else {
        rounds.forEach(r => group1Rounds.add(r.name));
      }
    });
    const g1 = Array.from(group1Rounds);
    const g2 = Array.from(group2Rounds);

    // B. Fetch Participants, Dashboard, & Trainer
    const [participants] = await pool.query(
      `SELECT p.*, 
              d.round_status, d.status AS cert_status, 
              t.name AS trainer_name, t.agency
       FROM participants p
       LEFT JOIN dashboard d ON d.mpin = p.mpin
       LEFT JOIN trainers t ON t.username = d.trainer_id
       WHERE p.date = ? AND p.project_name IN (?)
       ORDER BY p.region, p.time_from`,
      [date, projects]
    );

    if (participants.length === 0) {
      return res.status(404).json({ success: false, error: 'No data found' });
    }

    // C. Fetch Rounds (Scores)
    const mpins = participants.map(p => p.mpin);
    const [rounds] = await pool.query(
      `SELECT mpin, round_name, score FROM participant_rounds WHERE mpin IN (?)`,
      [mpins]
    );

    // Map rounds for easy lookup: { "MPIN123": { "Round 2": 45, "Round 3": 50 } }
    const roundMap = {};
    rounds.forEach(r => {
      (roundMap[r.mpin] ||= {})[r.round_name] = r.score;
    });

    // ==========================================
    // 2. BUILD EXCEL WORKBOOK
    // ==========================================
    const wb = new ExcelJS.Workbook();

    // ==========================================
    // SHEET 1: SUMMARY
    // ==========================================
    const wsSummary = wb.addWorksheet('Summary');

    // Get dynamic roles (EV, DSE, TL B, etc.)
    const roles = [...new Set(participants.map(p => p.role).filter(Boolean))].sort();
    const n = roles.length;

    // Create Headers
    const r1 = ['MAIN ROUND', 'REGION', 'CONTEST', 'Mapped', ...Array(n - 1).fill(''), 'Total', 'Appeared', ...Array(n - 1).fill(''), 'Total', 'Certified', ...Array(n - 1).fill(''), 'Total', 'Certified %'];
    const r2 = ['DATE', '', 'LOCATION', ...roles, 'Total', ...roles, 'Total', ...roles, 'Total', 'from Appeared'];

    wsSummary.addRow(r1);
    wsSummary.addRow(r2);

    // Merge Headers
    wsSummary.mergeCells('A1:A2'); wsSummary.mergeCells('B1:B2'); wsSummary.mergeCells('C1:C2');
    let col = 4;
    wsSummary.mergeCells(1, col, 1, col + n); col += n + 1; // Mapped
    wsSummary.mergeCells(1, col, 1, col + n); col += n + 1; // Appeared
    wsSummary.mergeCells(1, col, 1, col + n); col += n + 1; // Certified
    wsSummary.mergeCells(1, col, 2, col); // Certified %

    // Style Headers
    [1, 2].forEach(rowNum => {
      wsSummary.getRow(rowNum).eachCell({ includeEmpty: true }, (cell, c) => {
        cell.font = { bold: true, size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        if (c <= 3) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
        else if (c <= 3 + n + 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C6E7' } };
        else if (c <= 3 + (n + 1) * 2) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
        else if (c <= 3 + (n + 1) * 3) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
        else cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD966' } };
      });
    });

    // Aggregate Data
    const regions = [...new Set(participants.map(p => p.region).filter(Boolean))].sort();
    const gtMapped = Array(n).fill(0), gtApp = Array(n).fill(0), gtCert = Array(n).fill(0);

    regions.forEach(reg => {
      const pRows = participants.filter(p => p.region === reg);
      const mapped = roles.map(r => pRows.filter(p => p.role === r).length);
      const app = roles.map(r => pRows.filter(p => p.role === r && ['Completed', 'In Progress'].includes(p.round_status)).length);
      const cert = roles.map(r => pRows.filter(p => p.role === r && p.cert_status === 'Pass').length);

      const tMap = mapped.reduce((a, b) => a + b, 0);
      const tApp = app.reduce((a, b) => a + b, 0);
      const tCert = cert.reduce((a, b) => a + b, 0);

      mapped.forEach((v, i) => gtMapped[i] += v);
      app.forEach((v, i) => gtApp[i] += v);
      cert.forEach((v, i) => gtCert[i] += v);

      wsSummary.addRow([
        new Date(date), reg, 'Online',
        ...mapped, tMap, ...app, tApp, ...cert, tCert, tApp > 0 ? tCert / tApp : 0
      ]);
    });

    // Grand Total
    wsSummary.addRow([
      'Grand Total', '', '',
      ...gtMapped, gtMapped.reduce((a, b) => a + b, 0),
      ...gtApp, gtApp.reduce((a, b) => a + b, 0),
      ...gtCert, gtCert.reduce((a, b) => a + b, 0),
      gtApp.reduce((a, b) => a + b, 0) > 0 ? gtCert.reduce((a, b) => a + b, 0) / gtApp.reduce((a, b) => a + b, 0) : 0
    ]);

    // Format Summary Data
    wsSummary.eachRow((row, rowNum) => {
      if (rowNum <= 2) return;
      row.eachCell({ includeEmpty: true }, (cell, c) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        if (c === 1) cell.numFmt = 'dd-mmm-yy';
        if (c === 3 + (n + 1) * 3 + 1) cell.numFmt = '0%';
      });
    });

    // ==========================================
    // SHEET 2: STATUS
    // ==========================================
    const wsStatus = wb.addWorksheet('Status');
    
    // Setup Columns
    const baseCols = ['S.NO.', 'MAIN ROUND DATE', 'Level', 'REGION', 'MSPIN', 'DEALER_CD_FOR_CD', 'DEALER_NAME', 'CITY', 'CHANNEL', 'NAME', 'DESG', 'Time From', 'Time To'];
    const tailCols = ['Total', 'Overall Total', 'Percentage', 'Attendance Status', 'Certified', 'Trainer Name', 'Agency'];

    const baseLen = baseCols.length;
    const g1Start = baseLen + 1, g1End = baseLen + g1.length;
    const g2Start = g1End + 1, g2End = g1End + g2.length;
    const tailStart = g2End + 1, tailEnd = tailStart + tailCols.length - 1;

    // Set Widths
    for (let i = 1; i <= tailEnd; i++) wsStatus.getColumn(i).width = 12;
    wsStatus.getColumn(7).width = 35; // Dealer
    wsStatus.getColumn(10).width = 25; // Name

    // Header Rows
    const hr1 = [...baseCols];
    hr1.push('TV_TL&CCM_L1 + TV_L2', ...Array(g1.length - 1).fill(''));
    hr1.push('TV_TL&CCM_L1', ...Array(g2.length - 1).fill(''));
    hr1.push(...tailCols);

    const hr2 = [...Array(baseLen).fill(''), ...g1, ...g2, ...Array(tailCols.length).fill('')];
    
    wsStatus.addRow(hr1);
    wsStatus.addRow(hr2);

    // Merge Headers
    if (g1.length > 1) wsStatus.mergeCells(1, g1Start, 1, g1End);
    if (g2.length > 1) wsStatus.mergeCells(1, g2Start, 1, g2End);
    for (let c = 1; c <= baseLen; c++) wsStatus.mergeCells(1, c, 2, c);
    for (let c = tailStart; c <= tailEnd; c++) wsStatus.mergeCells(1, c, 2, c);

    // Style Headers
    [1, 2].forEach(rowNum => {
      wsStatus.getRow(rowNum).eachCell({ includeEmpty: true }, (cell, c) => {
        cell.font = { bold: true, size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        if (c >= g1Start && c <= g1End) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C6E7' } };
        else if (c >= g2Start && c <= g2End) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
        else if (c >= tailStart && c <= tailEnd) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
        else cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
      });
    });

    // Populate Status Data
    participants.forEach((p, idx) => {
      const rm = roundMap[p.mpin] || {};
      const scG1 = g1.map(r => rm[r] || '');
      const scG2 = g2.map(r => rm[r] || '');
      
      const total = [...scG1, ...scG2].filter(v => typeof v === 'number').reduce((a, b) => a + b, 0);
      const percentage = total / 150; // Assuming 150 max
      const appeared = ['Completed', 'In Progress'].includes(p.round_status);
      const certified = appeared ? (p.cert_status === 'Pass' ? 'Yes' : 'No') : '';

      const row = wsStatus.addRow([
        idx + 1, new Date(p.date), p.level, p.region, p.mpin, p.dealer_code,
        p.dealer_name, p.city, p.channel, p.name, p.role, p.time_from, p.time_to,
        ...scG1, ...scG2, 
        total, 150, percentage, appeared ? 'Appeared' : 'Not Appeared', certified, p.trainer_name || '—', p.agency || '—'
      ]);

      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      row.getCell(2).numFmt = 'dd-mmm-yy';
      row.getCell(tailStart + 2).numFmt = '0%'; // Percentage
    });

    // ==========================================
    // 3. SEND RESPONSE
    // ==========================================
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="TV_Main_Round_Status_${date}.xlsx"`);
    
    await wb.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('[exportCombinedReport]', err);
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
    
    // Dynamically map headers
    const headerMap = {};
    ws.getRow(1).eachCell((cell, colNumber) => {
      if (cell.value) headerMap[String(cell.value).trim().toLowerCase()] = colNumber;
    });

    const roundsData = [];
    const uniqueTrainers = new Map(); // To store { username: { name, agency } }

    // Safe date formatter for Excel
    const formatDateTime = (val) => {
      if (!val) return null;
      let d = val instanceof Date ? val : new Date(val);
      if (isNaN(d)) return String(val).trim(); // Fallback if it's already a string
      
      const pad = (num) => String(num).padStart(2, '0');
      // Using UTC methods to avoid timezone shifting on Date objects
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
    };

    // 1. Parse Excel Data
    ws.eachRow((row, rowNo) => {
      if (rowNo === 1) return;

      const getValue = (headerName) => {
        const col = headerMap[headerName.toLowerCase()];
        return col ? row.getCell(col).value : null;
      };

      const mpin = String(getValue('MSPIN') || '').trim();
      const round_name = String(getValue('Round Name') || '').trim();
      const trainer_id = String(getValue('Trainer Username') || '').trim();
      
      if (!mpin || !round_name || !trainer_id) return; // Skip invalid rows

      const start_time = formatDateTime(getValue('Start Time'));
      const end_time = formatDateTime(getValue('End Time'));
      
      const rawScore = getValue('Score');
      const score = (rawScore !== null && rawScore !== '') ? Number(rawScore) : null;

      // Add to rounds data
      roundsData.push([mpin, trainer_id, round_name, start_time, score, end_time]);

      // Collect unique trainers for the trainers table
      if (!uniqueTrainers.has(trainer_id)) {
        const tName = String(getValue('Trainer Name') || '').trim() || trainer_id; // Fallback to username if name is empty
        const tAgency = String(getValue('Agency') || '').trim() || null;
        uniqueTrainers.set(trainer_id, { name: tName, agency: tAgency });
      }
    });

    if (roundsData.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid data found in Excel' });
    }

    // 2. Check for existing trainers
    const usernames = Array.from(uniqueTrainers.keys());
    const [existingTrainers] = await pool.query(
      `SELECT username FROM trainers WHERE username IN (?)`,
      [usernames]
    );
    const existingUsernames = new Set(existingTrainers.map(t => t.username));

    // 3. Insert missing trainers into the database
    const newTrainers = [];
    uniqueTrainers.forEach((info, username) => {
      if (!existingUsernames.has(username)) {
        // Set password to null, status to active. 
        // Base location and photo_url are omitted (they default to NULL).
        newTrainers.push([username, info.name, info.agency, 'active']);
      }
    });

    if (newTrainers.length > 0) {
      const insertTrainerQuery = `
        INSERT INTO trainers (username, name, agency, status) 
        VALUES ?
      `;
      await pool.query(insertTrainerQuery, [newTrainers]);
    }

    // 4. Insert rounds into participant_rounds
    const insertRoundQuery = `
      INSERT INTO participant_rounds 
        (mpin, trainer_id, round_name, start_time, score, end_time)
      VALUES ?
    `;
    await pool.query(insertRoundQuery, [roundsData]);

    res.json({ 
      success: true, 
      message: `Imported ${roundsData.length} rounds. Added ${newTrainers.length} new trainers to the system.` 
    });

  } catch (err) {
    console.error('[importParticipantRounds]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};