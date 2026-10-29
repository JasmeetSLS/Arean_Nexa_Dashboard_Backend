const bcrypt   = require('bcryptjs');
const pool     = require('../config/db');
const JWTUtils = require('../utils/jwt.util');
const ExcelJS = require('exceljs');

// =====================================================================
// POST /api/auth/login
// body: { username, password, type }   type = 'admin' | 'trainer'
// =====================================================================
exports.login = async (req, res) => {
  try {
    const { username, password, type = 'admin' } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password required',
      });
    }

    if (!['admin', 'trainer'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid type. Must be "admin" or "trainer".',
      });
    }

    // ---- pick the right table based on type ----
    const table = type === 'admin' ? 'admin' : 'trainers';

    const [rows] = await pool.query(
      `SELECT id, username, password, status
         FROM ${table}
        WHERE username = ?
        LIMIT 1`,
      [username.trim()]
    );

    if (!rows.length) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    const user = rows[0];

    // `trainers` has no status column — treat missing as active
    if (user.status && user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive',
      });
    }

    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: 'Password not set for this account',
      });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    // ---- sign JWT ----
    const token = JWTUtils.generateToken({
      userId:   user.id,
      username: user.username,
      type,
    });

    res.json({
      success: true,
      token,
      user: {
        userId:   user.id,
        username: user.username,
        type,
      },
    });
  } catch (err) {
    console.error('[auth.login]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

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
        LEFT JOIN trainers t ON t.username = d.trainer_id
       WHERE p.project_name = ? AND p.date = ?
       ORDER BY STR_TO_DATE(p.time_from, '%h:%i %p'), p.mpin`,
      [project, date]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No data found' });
    }

    // Dynamically get all unique roles
    const roles = [...new Set(rows.map(r => r.eligible).filter(Boolean))].sort();
    const numRoles = roles.length;

    // --- DYNAMIC SLOT COLORS ---
    // Array of distinct pastel colors
    const slotColors = [
      'FFF4B084', // Orange
      'FFC6E0B4', // Light Green
      'FFBDD7EE', // Light Blue
      'FFFFE699', // Light Yellow
      'FFD9D2E9', // Light Purple
      'FFF8CBAD', // Peach
      'FFB4C6E7', // Muted Blue
      'FFE2EFDA'  // Pale Green
    ];
    // Get all unique time_from values to assign colors
    const uniqueSlots = [...new Set(rows.map(r => r.time_from))].filter(Boolean);
    const slotColorMap = {};
    uniqueSlots.forEach((slot, index) => {
      slotColorMap[slot] = slotColors[index % slotColors.length];
    });

    const wb = new ExcelJS.Workbook();

    // ==========================================
    // SHEET 1: SUMMARY
    // ==========================================
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

    // Merge Header Cells
    wsSummary.mergeCells('A1:A2');
    wsSummary.mergeCells('B1:B2');
    
    let col = 3;
    wsSummary.mergeCells(1, col, 1, col + numRoles); col += numRoles + 1; // Mapped
    wsSummary.mergeCells(1, col, 1, col + numRoles); col += numRoles + 1; // Expected
    wsSummary.mergeCells(1, col, 1, col + numRoles); col += numRoles + 1; // Appeared
    wsSummary.mergeCells(1, col, 1, col + numRoles); col += numRoles + 1; // Certified
    
    // Vertically merged down to row 2
    wsSummary.mergeCells(1, col, 2, col); col += 1; // Appeared % Slots 
    wsSummary.mergeCells(1, col, 2, col); col += 1; // Appeared % Mapped
    
    wsSummary.mergeCells(1, col, 1, col + numRoles); // Certified %

    // Style Headers
    [1, 2].forEach(rowNum => {
      const r = wsSummary.getRow(rowNum);
      r.height = 45; 
      r.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { bold: true, color: { argb: 'FF000000' }, size: 11 };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
        };

        if (colNumber <= 2 || (colNumber > col - 3 - numRoles - 1 && colNumber <= col - numRoles - 1)) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } }; // Gray
        } else if (colNumber <= 2 + numRoles + 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C6E7' } }; // Blue
        } else if (colNumber <= 2 + (numRoles + 1) * 2) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } }; // Green
        } else if (colNumber <= 2 + (numRoles + 1) * 3) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } }; // Peach
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD966' } }; // Gold/Orange
        }
      });
    });

    // 2. Build Data Rows
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

    // Grand Total Row
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

    // Write Data Rows to Excel
    summaryRows.forEach((data, idx) => {
      const r = wsSummary.addRow(data);
      const isGrand = idx === summaryRows.length - 1;
      
      r.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        if (isGrand) cell.font = { bold: true };
        if (colNum === 1 && data[0] instanceof Date) cell.numFmt = 'dd-mmm-yy';
        
        if (colNum > 2 + (numRoles + 1) * 4) {
          cell.numFmt = '0%';
        }
      });
    });


    // ==========================================
    // SHEET 2: STATUS
    // ==========================================
    const wsStatus = wb.addWorksheet('Status');

    wsStatus.columns = [
      { header: 'S.NO.', key: 'sno', width: 7 },
      { header: 'MAIN ROUND\nDATE', key: 'date', width: 18 },
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
      { header: 'Appeared\nStatus', key: 'appeared_status', width: 18 },
      { header: 'Certified\nStatus', key: 'certified_status', width: 18 },
    ];

    // Header formatting
    const hRow = wsStatus.getRow(1);
    hRow.height = 40; 
    const grayCols = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11]; 

    hRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, color: { argb: 'FF000000' }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

      if (grayCols.includes(colNumber)) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } }; 
      } else if (colNumber === 2 || colNumber === 16) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; // Yellow
      } else if (colNumber === 15) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4B084' } }; // Peach
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C6E7' } }; // Blue
      }
    });

    // Data rows
    rows.forEach(r => {
      const row = wsStatus.addRow(r);
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { color: { argb: 'FF000000' }, size: 11 };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

        // Apply the dynamic unique color for each time slot block
        if (colNumber === 12 || colNumber === 13) {
          const slotColor = slotColorMap[r.time_from] || 'FFFFFFFF'; 
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: slotColor } }; 
        }
      });

      // Centering & Date Formats
      ['sno', 'date', 'region', 'mpin', 'dealer_code', 'agency', 'time_from', 'time_to', 'time_slot_completed', 'appeared_status', 'certified_status'].forEach(key => {
        row.getCell(key).alignment = { vertical: 'middle', horizontal: 'center' };
      });

      if (row.getCell('date').value) row.getCell('date').numFmt = 'dd-mmm-yy';
      row.getCell('time_from').numFmt = '@'; 
      row.getCell('time_to').numFmt = '@';
    });

    // 6. Export File
    const safeProject = String(project).replace(/[^a-z0-9]+/gi, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Summary_${safeProject}_${date}.xlsx"`);

    await wb.xlsx.write(res);
    res.end();
    
  } catch (err) {
    console.error('[exportSchedule]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.exportArenaAttendance = async (req, res) => {
  try {
    // 1. Fetch data with dynamic status based on current time vs time_to
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
       LEFT JOIN trainers t ON t.username = d.trainer_id
       WHERE p.project_name IN ('Arena L1', 'Arena L2')
       ORDER BY p.date DESC, STR_TO_DATE(p.time_from, '%h:%i %p'), p.mpin`
    );

    if (!rows.length) return res.status(404).json({ success: false, error: 'No data found' });

    // 2. Time Slot Colors Map
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

      // --- HEADER STYLING ---
      const hRow = ws.getRow(1);
      hRow.height = 30;
      hRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FF000000' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C6E7' } }; // Light Blue Header
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });

      // --- DATA ROWS ---
      data.forEach((r, index) => {
        const row = ws.addRow({
          sno: index + 1,
          ...r,
          date: new Date(r.date) 
        });

        const rowColor = slotColorMap[r.time_from] || 'FFFFFFFF';

        // Apply borders and alignment to the whole row
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        // Apply color ONLY to Time From and Time To columns
        if (rowColor !== 'FFFFFFFF') {
          row.getCell('time_from').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowColor } };
          row.getCell('time_to').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowColor } };
        }

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
      { header: 'REGION', key: 'region', width: 10 },
      { header: 'Level', key: 'level', width: 10 },
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
      date: '18-Sep-26', region: 'C1', level: 'L1', project_name: 'Arena L1',
      mpin: '730347', dealer_code: '08D6-08', city: 'DELHI', dealer_name: 'RANA MOTORS PVT LTD', 
      name: 'ASHISH SALUJA', role: 'Sales Captain', appeared_status: 'Appeared',
      Product: 24, 'Advance Technology': 2, VAS: 2, 'Soft Skills': 2, total_r1: 30, result: 'Pass'
    });

    // Dropdown for Appeared Status
    ws.dataValidations.add('K2:K5000', {
      type: 'list', allowBlank: false,
      formulae: ['"Appeared,Not Appeared"']
    });

    // Dropdown for Result (Only Pass and Fail)
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
      'round 1 date', 'region', 'level', 'project name', 'mspin', 'dealer code', 
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
      const dealer_code = String(getValue('DEALER CODE') || '').trim();
      const city = String(getValue('Dealer City') || '').trim();
      const dealer_name = String(getValue('DEALER NAME') || '').trim();
      const role = String(getValue('Role') || '').trim();
      
      const status = String(getValue('Appeared Status') || '').trim();
      const appeared_status = status === 'Appeared' ? 'Appeared' : 'Not Appeared';
      
      // Safely validate ENUM values (Pass or Fail only)
      let result = String(getValue('Result') || '').trim();
      if (!['Pass', 'Fail'].includes(result)) {
        result = null; 
      }

      let category_score = null;
      let total_r1 = 0;

      if (appeared_status === 'Appeared') {
        const scoreObj = {};
        dynamicCategories.forEach(cat => {
          const scoreVal = Number(row.getCell(cat.col).value) || 0;
          scoreObj[cat.name] = scoreVal;
          total_r1 += scoreVal;
        });
        category_score = JSON.stringify(scoreObj); 
      }

      updates.push([mpin, project_name, level, dateVal, dealer_code, city, dealer_name, role, appeared_status, category_score, total_r1, result]);
    });

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid data found' });
    }

    const query = `
      INSERT INTO round_1 
        (mpin, project_name, level, round_1_date, dealer_code, city, dealer_name, role, appeared_status, category_score, total_r1, result)
      VALUES ?
      ON DUPLICATE KEY UPDATE
        project_name = VALUES(project_name),
        level = VALUES(level),
        round_1_date = VALUES(round_1_date),
        dealer_code = VALUES(dealer_code),
        city = VALUES(city),
        dealer_name = VALUES(dealer_name),
        role = VALUES(role),
        appeared_status = VALUES(appeared_status),
        category_score = VALUES(category_score),
        total_r1 = VALUES(total_r1),
        result = VALUES(result)
    `;

    await pool.query(query, [updates]);

    res.json({ success: true, message: `Successfully imported ${updates.length} records.` });

  } catch (err) {
    console.error('[importRound1]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};