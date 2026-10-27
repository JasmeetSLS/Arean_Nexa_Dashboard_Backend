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

exports.exportSchedule = async (req, res) => {
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

    // Dynamically get all unique roles (e.g., Sales Captain, Sales Expert, etc.)
    const roles = [...new Set(rows.map(r => r.eligible).filter(Boolean))].sort();
    const numRoles = roles.length;

    const wb = new ExcelJS.Workbook();

    // ==========================================
    // SHEET 1: SUMMARY
    // ==========================================
    const wsSummary = wb.addWorksheet('Summary');

    // 1. Build Headers using simple array construction
    const header1 = [
      'MAIN ROUND', 'REGION', 
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
    
    wsSummary.mergeCells(1, col, 1, col); col += 1; // Appeared % Slots
    wsSummary.mergeCells(1, col, 1, col); col += 1; // Appeared % Mapped
    wsSummary.mergeCells(1, col, 1, col + numRoles); // Certified %

    // Style Headers
    [1, 2].forEach(rowNum => {
      const r = wsSummary.getRow(rowNum);
      r.height = 30;
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

      // Add to Grand Totals
      mapped.forEach((v, i) => gtMapped[i] += v); gtMappedT += totMapped;
      expected.forEach((v, i) => gtExp[i] += v); gtExpT += totExp;
      appeared.forEach((v, i) => gtApp[i] += v); gtAppT += totApp;
      certified.forEach((v, i) => gtCert[i] += v); gtCertT += totCert;

      // Build Row Array
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
        
        // Percentages
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
    hRow.height = 35;
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

        // Orange color for Time From and Time To
        if (colNumber === 12 || colNumber === 13) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4B084' } }; 
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