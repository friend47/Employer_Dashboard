const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});


app.get('/jobs', async (req, res) => {
  const {
    geography,
    province,
    district,
    job_type,   // ตัวเลข id ที่ส่งมาจาก dropdown
    min_wage,
    max_wage
  } = req.query;

  let sql = `
    SELECT
      g.name AS geography,
      p.name_th AS province,
      d.name_th AS district,
      jt.job_type AS job_type,
      COUNT(*) AS total_jobs,
      ROUND(AVG(jp.wage_amount), 2) AS avg_wage,
      ROUND(AVG(jp.workers_needed), 2) AS avg_workers
    FROM jobposts jp
    JOIN sub_districts sd ON jp.sub_district_id = sd.id
    JOIN districts d ON sd.district_id = d.id
    JOIN provinces p ON d.province_id = p.id
    JOIN geographies g ON p.geography_id = g.id
    JOIN job_types jt ON jp.job_type_id = jt.job_type_id
    WHERE 1=1
  `;

  const params = [];

  if (geography) {
    params.push(geography);
    sql += ` AND p.geography_id = $${params.length}`;
  }

  if (province) {
    params.push(province);
    sql += ` AND p.id = $${params.length}`;
  }

  if (district) {
    params.push(district);
    sql += ` AND d.id = $${params.length}`;
  }

  // กรองด้วย id (ของ jobposts)
  if (job_type) {
    params.push(job_type);
    sql += ` AND jp.job_type_id = $${params.length}`;
  }

  if (min_wage) {
    params.push(min_wage);
    sql += ` AND jp.wage_amount >= $${params.length}`;
  }

  if (max_wage) {
    params.push(max_wage);
    sql += ` AND jp.wage_amount <= $${params.length}`;
  }

  sql += `
    GROUP BY g.name, p.name_th, d.name_th, jt.job_type
    ORDER BY g.name, p.name_th, d.name_th, jt.job_type
  `;

  try {
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ /jobs error:", err);
    res.status(500).json({ error: err.message });
  }
});


// ที่เพิ่มมาใหม่
app.get('/geographies', async (req, res) => {
  const sql = `
    SELECT id, name
    FROM geographies
    ORDER BY id
  `;
  const { rows } = await pool.query(sql);
  res.json(rows);
});

app.get('/provinces', async (req, res) => {
  const { geography_id } = req.query;

  let sql = `
    SELECT id, name_th, geography_id
    FROM provinces
    WHERE 1=1
  `;
  const params = [];

  if (geography_id) {
    params.push(geography_id);
    sql += ` AND geography_id = $${params.length}`;
  }

  sql += ` ORDER BY name_th`;

  const { rows } = await pool.query(sql, params);
  res.json(rows);
});

app.get('/districts', async (req, res) => {
  const { province_id } = req.query;

  let sql = `
    SELECT id, name_th, province_id
    FROM districts
    WHERE 1=1
  `;
  const params = [];

  if (province_id) {
    params.push(province_id);
    sql += ` AND province_id = $${params.length}`;
  }

  sql += ` ORDER BY name_th`;

  const { rows } = await pool.query(sql, params);
  res.json(rows);
});

// สิ้นสุดส่วนที่เพิ่มมาใหม่

// เพิ่มใหม่ 2

function addParam(params, value) {
  params.push(value);
  return `$${params.length}`;
}

app.get("/dashboard/market", async (req, res) => {
  try {
    const { where, params } = buildJobpostFilters(req);

    const sql = `
      SELECT
        jt.job_type_id,
        jt.job_type,
        COUNT(DISTINCT jp.jobpost_id)::int AS posts,
        COUNT(ja.job_application_id)::int AS applications,
        COUNT(DISTINCT e.employment_id)::int AS hired,
        CASE WHEN COUNT(DISTINCT jp.jobpost_id) = 0 THEN 0
             ELSE ROUND(COUNT(ja.job_application_id)::numeric / COUNT(DISTINCT jp.jobpost_id)::numeric, 2)
        END AS apps_per_post,
        CASE WHEN COUNT(ja.job_application_id) = 0 THEN 0
             ELSE ROUND(COUNT(DISTINCT e.employment_id)::numeric / COUNT(ja.job_application_id)::numeric, 2)
        END AS hire_rate
      FROM jobposts jp
      JOIN job_types jt ON jp.job_type_id = jt.job_type_id
      JOIN sub_districts sd ON jp.sub_district_id = sd.id
      JOIN districts d ON sd.district_id = d.id
      JOIN provinces p ON d.province_id = p.id
      LEFT JOIN job_applications ja ON ja.jobpost_id = jp.jobpost_id
      LEFT JOIN employments e ON e.job_application_id = ja.job_application_id
      ${where}
      GROUP BY jt.job_type_id, jt.job_type
      ORDER BY posts DESC, jt.job_type
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ /dashboard/market error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/dashboard/geo/provinces", async (req, res) => {
  try {
    const { where, params } = buildJobpostFilters(req);

    const sql = `
      SELECT
        g.name AS geography,
        p.name_th AS province,
        COUNT(DISTINCT jp.jobpost_id)::int AS posts,
        COUNT(ja.job_application_id)::int AS applications,
        CASE WHEN COUNT(DISTINCT jp.jobpost_id)=0 THEN 0
             ELSE ROUND(COUNT(ja.job_application_id)::numeric / COUNT(DISTINCT jp.jobpost_id)::numeric, 2)
        END AS apps_per_post,
        ROUND(AVG(jp.wage_amount), 2) AS avg_wage
      FROM jobposts jp
      JOIN sub_districts sd ON jp.sub_district_id = sd.id
      JOIN districts d ON sd.district_id = d.id
      JOIN provinces p ON d.province_id = p.id
      JOIN geographies g ON p.geography_id = g.id
      LEFT JOIN job_applications ja ON ja.jobpost_id = jp.jobpost_id
      ${where}
      GROUP BY g.name, p.name_th
      ORDER BY posts DESC, p.name_th
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ /dashboard/geo/provinces error:", err);
    res.status(500).json({ error: err.message });
  }
});

async function hasTable(pool, tableName) {
  const sql = `
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema='public' AND table_name=$1
    LIMIT 1
  `;
  const { rows } = await pool.query(sql, [tableName]);
  return rows.length > 0;
}

async function hasColumn(pool, tableName, columnName) {
  const sql = `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name=$1 AND column_name=$2
    LIMIT 1
  `;
  const { rows } = await pool.query(sql, [tableName, columnName]);
  return rows.length > 0;
}

async function getJobTitleExpression(pool, jobpostAlias = "jp", jobTypeAlias = "jt") {
  const expressions = [];

  if (await hasColumn(pool, "jobposts", "job_title")) {
    expressions.push(`NULLIF(TRIM(${jobpostAlias}.job_title), '')`);
  }

  if (await hasColumn(pool, "jobposts", "title")) {
    expressions.push(`NULLIF(TRIM(${jobpostAlias}.title), '')`);
  }

  expressions.push(`${jobTypeAlias}.job_type`);
  return `COALESCE(${expressions.join(", ")})`;
}

async function getApplicationSeekerIdExpression(pool, applicationAlias = "ja") {
  if (await hasColumn(pool, "job_applications", "worker_id")) {
    return `${applicationAlias}.worker_id`;
  }

  if (await hasColumn(pool, "job_applications", "job_seeker_id")) {
    return `${applicationAlias}.job_seeker_id`;
  }

  return "NULL";
}

async function getApplicationStatusExpression(pool, applicationAlias = "ja") {
  if (await hasColumn(pool, "job_applications", "application_status")) {
    return `${applicationAlias}.application_status`;
  }

  if (await hasColumn(pool, "job_applications", "status")) {
    return `${applicationAlias}.status`;
  }

  return null;
}

async function getProfileJoinCondition(pool, jobSeekerAlias = "js", profileAlias = "pr") {
  const hasSeekerUserId = await hasColumn(pool, "job_seekers", "user_id");
  const hasSeekerProfileId = await hasColumn(pool, "job_seekers", "profile_id");
  const hasProfileId = await hasColumn(pool, "profiles", "id");
  const hasProfileProfileId = await hasColumn(pool, "profiles", "profile_id");

  if (hasSeekerUserId && hasProfileId) {
    return `${profileAlias}.id = ${jobSeekerAlias}.user_id`;
  }

  if (hasSeekerProfileId && hasProfileProfileId) {
    return `${profileAlias}.profile_id = ${jobSeekerAlias}.profile_id`;
  }

  if (hasSeekerProfileId && hasProfileId) {
    return `${profileAlias}.id = ${jobSeekerAlias}.profile_id`;
  }

  return null;
}

/**
 * Filter สำหรับ jobposts-based endpoints
 * ใช้กับ jp.created_at เป็นช่วงเวลา
 */
function buildJobpostFilters(req) {
  const {
    geography, province, district, job_type,
    min_wage, max_wage,
    start_date, end_date, // YYYY-MM-DD หรือ timestamp ก็ได้
    approval_status
  } = req.query;

  const params = [];
  let where = "WHERE 1=1";

  if (start_date) where += ` AND jp.created_at >= ${addParam(params, start_date)}`;
  if (end_date) where += ` AND jp.created_at <  ${addParam(params, end_date)}`;

  if (geography) where += ` AND p.geography_id = ${addParam(params, geography)}`;
  if (province) where += ` AND p.id = ${addParam(params, province)}`;
  if (district) where += ` AND d.id = ${addParam(params, district)}`;

  if (job_type) where += ` AND jp.job_type_id = ${addParam(params, job_type)}`;

  if (min_wage) where += ` AND jp.wage_amount >= ${addParam(params, min_wage)}`;
  if (max_wage) where += ` AND jp.wage_amount <= ${addParam(params, max_wage)}`;

  if (approval_status) where += ` AND jp.approval_status = ${addParam(params, approval_status)}`;

  return { where, params };
}

/**
 * Filter สำหรับ endpoints ที่ time-based เป็น applied_at (พฤติกรรมผู้สมัคร)
 */
function buildApplicationFilters(req) {
  const {
    geography, province, district, job_type,
    min_wage, max_wage,
    start_date, end_date
  } = req.query;

  const params = [];
  let where = "WHERE 1=1";

  if (start_date) where += ` AND ja.applied_at >= ${addParam(params, start_date)}`;
  if (end_date) where += ` AND ja.applied_at <  ${addParam(params, end_date)}`;

  if (geography) where += ` AND p.geography_id = ${addParam(params, geography)}`;
  if (province) where += ` AND p.id = ${addParam(params, province)}`;
  if (district) where += ` AND d.id = ${addParam(params, district)}`;

  if (job_type) where += ` AND jp.job_type_id = ${addParam(params, job_type)}`;

  if (min_wage) where += ` AND jp.wage_amount >= ${addParam(params, min_wage)}`;
  if (max_wage) where += ` AND jp.wage_amount <= ${addParam(params, max_wage)}`;

  return { where, params };
}

app.get("/dashboard/overview", async (req, res) => {
  try {
    const { where, params } = buildJobpostFilters(req);

    // ตรวจ employments ก่อน (กันพัง)
    const employmentExists = await hasTable(pool, "employments");
    let hireCte = `SELECT 0::int AS total_employments`; // default ถ้าไม่มี table

    if (employmentExists) {
      const hasJobpostId = await hasColumn(pool, "employments", "jobpost_id");
      const hasJobApplicationId = await hasColumn(pool, "employments", "job_application_id");

      if (hasJobpostId) {
        hireCte = `
          SELECT COUNT(*)::int AS total_employments
          FROM employments e
          JOIN base b ON e.jobpost_id = b.jobpost_id
        `;
      } else if (hasJobApplicationId) {
        hireCte = `
          SELECT COUNT(*)::int AS total_employments
          FROM employments e
          JOIN job_applications ja ON e.job_application_id = ja.job_application_id
          JOIN base b ON ja.jobpost_id = b.jobpost_id
        `;
      } else {
        // มี table แต่ไม่รู้จะ join ยังไง -> คืน 0
        hireCte = `SELECT 0::int AS total_employments`;
      }
    }

    const sql = `
      WITH base AS (
        SELECT jp.jobpost_id
        FROM jobposts jp
        JOIN sub_districts sd ON jp.sub_district_id = sd.id
        JOIN districts d ON sd.district_id = d.id
        JOIN provinces p ON d.province_id = p.id
        ${where}
      ),
      posts AS (
        SELECT COUNT(*)::int AS total_jobposts FROM base
      ),
      apps AS (
        SELECT
          COUNT(*)::int AS total_applications,
          COUNT(DISTINCT ja.job_seeker_id)::int AS unique_applicants
        FROM job_applications ja
        JOIN base b ON ja.jobpost_id = b.jobpost_id
      ),
      hires AS (
        ${hireCte}
      ),
      seekers AS (
        SELECT
          COUNT(*)::int AS total_jobseekers,
          COUNT(*) FILTER (
            WHERE (
              $${params.length + 1}::timestamptz IS NULL
              OR js.created_at >= $${params.length + 1}::timestamptz
            )
            AND (
              $${params.length + 2}::timestamptz IS NULL
              OR js.created_at <  $${params.length + 2}::timestamptz
            )
          )::int AS new_jobseekers_in_range
        FROM job_seekers js
      )

      SELECT
        (SELECT total_jobposts FROM posts) AS total_jobposts,
        (SELECT total_applications FROM apps) AS total_applications,
        (SELECT unique_applicants FROM apps) AS unique_applicants,
        (SELECT total_employments FROM hires) AS total_employments,
        CASE
          WHEN (SELECT total_applications FROM apps)=0 THEN 0
          ELSE ROUND(
            (SELECT total_employments FROM hires)::numeric
            / (SELECT total_applications FROM apps)::numeric
          , 4)
        END AS conversion_rate,
        (SELECT total_jobseekers FROM seekers) AS total_jobseekers,
        (SELECT new_jobseekers_in_range FROM seekers) AS new_jobseekers_in_range
    `;

    // ใช้ start_date/end_date เดิมให้ seekers ด้วย (ถ้าไม่ได้ส่งมา = null)
    const start_date = req.query.start_date || null;
    const end_date = req.query.end_date || null;

    const { rows } = await pool.query(sql, [...params, start_date, end_date]);
    res.json(rows[0]);
  } catch (err) {
    console.error("❌ /dashboard/overview error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/dashboard/geo/area", async (req, res) => {
  try {
    const { where, params } = buildJobpostFilters(req);

    const sql = `
      SELECT
        g.name AS geography,
        p.name_th AS province,
        d.name_th AS district,
        COUNT(DISTINCT jp.jobpost_id)::int AS posts,
        COUNT(ja.job_application_id)::int AS applications,
        CASE WHEN COUNT(DISTINCT jp.jobpost_id)=0 THEN 0
             ELSE ROUND(COUNT(ja.job_application_id)::numeric / COUNT(DISTINCT jp.jobpost_id)::numeric, 2)
        END AS apps_per_post,
        ROUND(AVG(jp.wage_amount), 2) AS avg_wage,
        ROUND(AVG(jp.workers_needed), 2) AS avg_workers_needed
      FROM jobposts jp
      JOIN sub_districts sd ON jp.sub_district_id = sd.id
      JOIN districts d ON sd.district_id = d.id
      JOIN provinces p ON d.province_id = p.id
      JOIN geographies g ON p.geography_id = g.id
      LEFT JOIN job_applications ja ON ja.jobpost_id = jp.jobpost_id
      ${where}
      GROUP BY g.name, p.name_th, d.name_th
      ORDER BY posts DESC, g.name, p.name_th, d.name_th
      LIMIT 200
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ /dashboard/geo/area error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/dashboard/gov/status", async (req, res) => {
  try {
    const { where, params } = buildJobpostFilters(req);

    const sql = `
      WITH x AS (
        SELECT
          jp.approval_status,
          COUNT(*)::int AS posts_count
        FROM jobposts jp
        JOIN sub_districts sd ON jp.sub_district_id = sd.id
        JOIN districts d ON sd.district_id = d.id
        JOIN provinces p ON d.province_id = p.id
        ${where}
        GROUP BY jp.approval_status
      ),
      total AS (
        SELECT SUM(posts_count)::numeric AS total_posts FROM x
      )
      SELECT
        approval_status,
        posts_count,
        CASE WHEN (SELECT total_posts FROM total)=0 THEN 0
             ELSE ROUND(posts_count::numeric / (SELECT total_posts FROM total), 4)
        END AS share
      FROM x
      ORDER BY posts_count DESC
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ /dashboard/gov/status error:", err);
    res.status(500).json({ error: err.message });
  }
});
/* ================================
   Dashboard: Users by Role
   ตาราง: profiles
================================ */
app.get("/dashboard/gov/lco", async (req, res) => {
  try {
    const { where, params } = buildJobpostFilters(req);

    const hasName = await hasColumn(pool, "legal_compliance_officers", "name");
    const nameSelect = hasName ? ", lco.name AS lco_name" : "";
    const groupByName = hasName ? ", lco.name" : "";

    const sql = `
      SELECT
        jp.lco_id
        ${nameSelect},
        COUNT(*)::int AS total_assigned,
        COUNT(*) FILTER (WHERE jp.approval_status = 'Pending')::int AS pending_count,
        COUNT(*) FILTER (WHERE jp.approval_status = 'Approved')::int AS approved_count,
        COUNT(*) FILTER (WHERE jp.approval_status = 'Rejected')::int AS rejected_count,
        ROUND(
          AVG(EXTRACT(EPOCH FROM (jp.approval_date - jp.created_at)) / 3600)
            FILTER (WHERE jp.approval_date IS NOT NULL)
        , 2) AS avg_review_hours,
        COALESCE(SUM(jp.appeal_count), 0)::int AS total_appeals
      FROM jobposts jp
      JOIN sub_districts sd ON jp.sub_district_id = sd.id
      JOIN districts d ON sd.district_id = d.id
      JOIN provinces p ON d.province_id = p.id
      LEFT JOIN legal_compliance_officers lco ON jp.lco_id = lco.lco_id
      ${where}
      GROUP BY jp.lco_id ${groupByName}
      ORDER BY pending_count DESC, total_assigned DESC
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ /dashboard/gov/lco error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/dashboard/behavior/demographics", async (req, res) => {
  try {
    const { where, params } = buildApplicationFilters(req);

    const sql = `
      SELECT
        jt.job_type,
        COALESCE(js.gender, 'Unknown') AS gender,
        CASE
          WHEN js.birth_date IS NULL THEN 'Unknown'
          WHEN DATE_PART('year', AGE(CURRENT_DATE, js.birth_date)) < 20 THEN '<20'
          WHEN DATE_PART('year', AGE(CURRENT_DATE, js.birth_date)) BETWEEN 20 AND 29 THEN '20-29'
          WHEN DATE_PART('year', AGE(CURRENT_DATE, js.birth_date)) BETWEEN 30 AND 39 THEN '30-39'
          WHEN DATE_PART('year', AGE(CURRENT_DATE, js.birth_date)) BETWEEN 40 AND 49 THEN '40-49'
          WHEN DATE_PART('year', AGE(CURRENT_DATE, js.birth_date)) BETWEEN 50 AND 59 THEN '50-59'
          ELSE '60+'
        END AS age_bucket,
        COUNT(DISTINCT ja.job_seeker_id)::int AS unique_applicants,
        COUNT(*)::int AS applications
      FROM job_applications ja
      JOIN job_seekers js ON ja.job_seeker_id = js.job_seeker_id
      JOIN jobposts jp ON ja.jobpost_id = jp.jobpost_id
      JOIN job_types jt ON jp.job_type_id = jt.job_type_id
      JOIN sub_districts sd ON jp.sub_district_id = sd.id
      JOIN districts d ON sd.district_id = d.id
      JOIN provinces p ON d.province_id = p.id
      ${where}
      GROUP BY jt.job_type, gender, age_bucket
      ORDER BY jt.job_type, gender, age_bucket
      LIMIT 500
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ /dashboard/behavior/demographics error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/dashboard/behavior/apps-per-user", async (req, res) => {
  try {
    const { where, params } = buildApplicationFilters(req);

    const sql = `
      SELECT
        ja.job_seeker_id,
        COUNT(*)::int AS applications
      FROM job_applications ja
      JOIN jobposts jp ON ja.jobpost_id = jp.jobpost_id
      JOIN sub_districts sd ON jp.sub_district_id = sd.id
      JOIN districts d ON sd.district_id = d.id
      JOIN provinces p ON d.province_id = p.id
      ${where}
      GROUP BY ja.job_seeker_id
      ORDER BY applications DESC
      LIMIT 50
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ /dashboard/behavior/apps-per-user error:", err);
    res.status(500).json({ error: err.message });
  }
});
// 📊 Dashboard: ผู้ใช้แยกตามบทบาท (Role)
app.get("/dashboard/users/by-role", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.rolename AS role,        -- ชื่อบทบาทจากตาราง roles
        COUNT(p.profile_id) AS total
      FROM profiles p
      JOIN roles r
        ON p.role_id = r.role_id   -- เชื่อมด้วย role_id (ของจริงใน DB)
      GROUP BY r.rolename
      ORDER BY r.rolename
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("❌ /dashboard/users/by-role error:", err);
    res.status(500).json({ error: "Failed to load user roles" });
  }
});



app.get("/dashboard/users/by-status", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        status,
        COUNT(*) AS total
      FROM profiles
      GROUP BY status
      ORDER BY status
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("❌ /dashboard/users/by-status error:", err);
    res.status(500).json({ error: err.message });
  }
});


// 📅 สถิติผู้ใช้แยกตามวันที่สมัคร
app.get("/dashboard/users/by-date", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        DATE(created_at) AS signup_date,
        COUNT(*) AS total
      FROM profiles
      GROUP BY DATE(created_at)
      ORDER BY signup_date
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("❌ /dashboard/users/by-date error:", err);
    res.status(500).json({ error: "Failed to load signup date stats" });
  }
});

// สมัครครบขั้นตอนหรือไม่
app.get("/api/admin/seeker-completion", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        p.profile_id,
        (js.job_seeker_id IS NOT NULL) AS completed
      FROM profiles p
      JOIN roles r
        ON p.role_id = r.role_id
      LEFT JOIN job_seekers js
        ON js.profile_id = p.profile_id
      WHERE r.rolename = 'JOBSEEKER'
    `);

    const summary = {
      completed: rows.filter(r => r.completed).length,
      incomplete: rows.filter(r => !r.completed).length
    };

    res.json({ summary, rows });
  } catch (err) {
    console.error("❌ seeker-completion error:", err);
    res.status(500).json({ error: err.message });
  }
});

//สถานะการอนุมัติ
app.get("/dashboard/jobs/by-approval-status", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        approval_status AS status,
        COUNT(*) AS total
      FROM jobposts
      GROUP BY approval_status
      ORDER BY approval_status
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load job approval status" });
  }
});

// ----------------------------
// Employer dashboard helpers
// ----------------------------
app.get("/api/employer/profile", async (req, res) => {
  try {
    const { employer_id } = req.query;
    if (!employer_id) return res.status(400).json({ error: "employer_id required" });

    const empSql = `SELECT * FROM employers WHERE employer_id = $1`;
    const { rows: empRows } = await pool.query(empSql, [employer_id]);
    if (empRows.length === 0) return res.status(404).json({ error: "Employer not found" });
    const employer = empRows[0];

    const jobsSql = `SELECT COUNT(*) AS total FROM jobposts WHERE employer_id = $1`;
    const { rows: jobsRows } = await pool.query(jobsSql, [employer_id]);
    const totalJobs = parseInt(jobsRows[0].total, 10) || 0;

    let completedJobs = 0;
    let activeWorkers = 0;
    const hasJobApplications = await hasTable(pool, "job_applications");
    const hasEmployments = await hasTable(pool, "employments");
    const hasEmploymentStatus = await hasColumn(pool, "employments", "employment_status");
    if (hasJobApplications && hasEmployments) {
      const activeFilterExpr = hasEmploymentStatus
        ? "COUNT(*) FILTER (WHERE LOWER(COALESCE(e.employment_status::text, '')) = 'active')::int"
        : "COUNT(e.employment_id)::int";
      const hiresSql = `
        SELECT
          COUNT(e.employment_id)::int AS total,
          ${activeFilterExpr} AS active_total
        FROM employments e
        JOIN job_applications ja ON e.job_application_id = ja.job_application_id
        JOIN jobposts jp ON ja.jobpost_id = jp.jobpost_id
        WHERE jp.employer_id = $1
      `;
      const { rows: hiresRows } = await pool.query(hiresSql, [employer_id]);
      completedJobs = parseInt(hiresRows[0].total, 10) || 0;
      activeWorkers = hasEmploymentStatus
        ? parseInt(hiresRows[0].active_total, 10) || 0
        : completedJobs;
    }

    res.json({
      ...employer,
      contact_method: employer.contact_method || "Email",
      contact_value: employer.contact_value || employer.email || null,
      verified: Boolean(employer.verified),
      total_jobs: totalJobs,
      completed_jobs: completedJobs,
      active_workers: activeWorkers,
    });
  } catch (err) {
    console.error("🚫 /employer/profile error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/employer/jobposts", async (req, res) => {
  try {
    const { employer_id } = req.query;
    const employerFilter = employer_id ? "WHERE jp.employer_id = $1" : "";
    const params = employer_id ? [employer_id] : [];
    const hasJobApplications = await hasTable(pool, "job_applications");
    const titleExpr = await getJobTitleExpression(pool);
    const provinceExpr = "COALESCE(p_direct.name_th, p_district.name_th, p_sd.name_th, '-')";

    const sql = `
      SELECT
        jp.jobpost_id,
        ${titleExpr} AS title,
        jt.job_type,
        ${provinceExpr} AS province,
        COALESCE(jp.approval_status::text, 'Unknown'::text) AS approval_status,
        COALESCE(jp.wage_amount, 0) AS wage_amount,
        jp.created_at::date AS posted_date,
        ${hasJobApplications ? "COUNT(ja.job_application_id)" : "0"}::int AS applicants
      FROM jobposts jp
      JOIN job_types jt ON jp.job_type_id = jt.job_type_id
      LEFT JOIN provinces p_direct ON p_direct.id = jp.province_id
      LEFT JOIN districts d_direct ON d_direct.id = jp.district_id
      LEFT JOIN provinces p_district ON p_district.id = d_direct.province_id
      LEFT JOIN sub_districts sd ON sd.id = jp.sub_district_id
      LEFT JOIN districts d_sd ON d_sd.id = sd.district_id
      LEFT JOIN provinces p_sd ON p_sd.id = d_sd.province_id
      ${hasJobApplications ? "LEFT JOIN job_applications ja ON ja.jobpost_id = jp.jobpost_id" : ""}
      ${employerFilter}
      GROUP BY jp.jobpost_id, ${titleExpr}, jt.job_type, ${provinceExpr}, jp.approval_status, jp.wage_amount, jp.created_at
      ORDER BY jp.created_at DESC
      LIMIT 50
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("🚫 /employer/jobposts error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/employer/applicants", async (req, res) => {
  try {
    const { employer_id } = req.query;
    const employerFilter = employer_id ? "AND jp.employer_id = $1" : "";
    const params = employer_id ? [employer_id] : [];
    const hasJobApplications = await hasTable(pool, "job_applications");
    if (!hasJobApplications) return res.json([]);

    const hasStatus = await hasColumn(pool, "job_applications", "status");
    const statusExpr = hasStatus ? "ja.status" : "'pending'";

    const sql = `
      SELECT
        ja.job_application_id,
        ja.job_seeker_id,
        COALESCE(${statusExpr}::text, 'pending'::text) AS status,
        ja.applied_at::date AS applied_at,
        jt.job_type AS job_title,
        p.name_th AS province
      FROM job_applications ja
      JOIN jobposts jp ON ja.jobpost_id = jp.jobpost_id
      JOIN job_types jt ON jp.job_type_id = jt.job_type_id
      JOIN sub_districts sd ON jp.sub_district_id = sd.id
      JOIN districts d ON sd.district_id = d.id
      JOIN provinces p ON d.province_id = p.id
      WHERE 1=1 ${employerFilter}
      ORDER BY ja.applied_at DESC
      LIMIT 50
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("🚫 /employer/applicants error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Reports: monthly posts/hires + job type distribution
app.get("/api/employer/reports", async (req, res) => {
  try {
    const hasJobposts = await hasTable(pool, "jobposts");
    if (!hasJobposts) return res.json({ monthly: [], job_types: [] });
    const hasJobApplications = await hasTable(pool, "job_applications");
    const hasEmployments = await hasTable(pool, "employments");

    const monthlySql = `
      SELECT
        to_char(date_trunc('month', jp.created_at), 'YYYY-MM') AS month,
        COUNT(*)::int AS jobposts,
        ${hasEmployments && hasJobApplications ? "COUNT(DISTINCT e.employment_id)" : "0"}::int AS hires
      FROM jobposts jp
      ${hasJobApplications ? "LEFT JOIN job_applications ja ON ja.jobpost_id = jp.jobpost_id" : ""}
      ${hasEmployments && hasJobApplications ? "LEFT JOIN employments e ON e.job_application_id = ja.job_application_id" : ""}
      WHERE jp.created_at >= NOW() - INTERVAL '6 months'
      GROUP BY 1
      ORDER BY 1
    `;

    const jobTypeSql = `
      SELECT
        jt.job_type,
        COUNT(*)::int AS posts
      FROM jobposts jp
      JOIN job_types jt ON jp.job_type_id = jt.job_type_id
      GROUP BY jt.job_type
      ORDER BY posts DESC
      LIMIT 10
    `;

    const [monthly, jobTypes] = await Promise.all([
      pool.query(monthlySql),
      pool.query(jobTypeSql)
    ]);

    res.json({ monthly: monthly.rows, job_types: jobTypes.rows });
  } catch (err) {
    console.error("🚫 /api/employer/reports error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Recent activity: latest jobposts and applications
app.get("/api/employer/recent-activity", async (req, res) => {
  try {
    const hasJobposts = await hasTable(pool, "jobposts");
    if (!hasJobposts) return res.json([]);
    const hasJobApplications = await hasTable(pool, "job_applications");

    const sql = `
      SELECT * FROM (
        SELECT jp.created_at AS ts, 'jobpost' AS kind, jp.jobpost_id AS ref_id,
               COALESCE(jp.title, jt.job_type) AS title,
               COALESCE(jp.approval_status::text, 'Unknown'::text) AS status
        FROM jobposts jp
        JOIN job_types jt ON jp.job_type_id = jt.job_type_id
        ${hasJobApplications ? `
        UNION ALL
        SELECT ja.applied_at AS ts, 'application' AS kind, ja.job_application_id AS ref_id,
               jt.job_type AS title,
               COALESCE(ja.status::text, 'pending'::text) AS status
        FROM job_applications ja
        JOIN jobposts jp ON ja.jobpost_id = jp.jobpost_id
        JOIN job_types jt ON jp.job_type_id = jt.job_type_id
        ` : ""}
      ) x
      ORDER BY ts DESC
      LIMIT 15
    `;
    const { rows } = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error("🚫 /api/employer/recent-activity error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Jobseekers list (used as employees table)
app.get("/api/employer/jobseekers", async (req, res) => {
  try {
    const hasJobseekers = await hasTable(pool, "job_seekers");
    if (!hasJobseekers) return res.json([]);
    const hasJobApplications = await hasTable(pool, "job_applications");
    const hasJobposts = await hasTable(pool, "jobposts");

    const sql = `
      SELECT
        js.job_seeker_id,
        COALESCE(js.gender, 'Unknown') AS gender,
        js.birth_date,
        p.name_th AS province,
        ${hasJobApplications ? "COUNT(ja.job_application_id)" : "0"}::int AS applications,
        ${hasJobApplications ? "MIN(ja.applied_at)" : "NULL"}::date AS first_applied
      FROM job_seekers js
      ${hasJobApplications ? "LEFT JOIN job_applications ja ON ja.job_seeker_id = js.job_seeker_id" : ""}
      ${hasJobApplications && hasJobposts ? `
      LEFT JOIN jobposts jp ON ja.jobpost_id = jp.jobpost_id
      LEFT JOIN sub_districts sd ON jp.sub_district_id = sd.id
      LEFT JOIN districts d ON sd.district_id = d.id
      LEFT JOIN provinces p ON d.province_id = p.id
      ` : ""}
      GROUP BY js.job_seeker_id, js.gender, js.birth_date, p.name_th
      ORDER BY applications DESC, js.job_seeker_id
      LIMIT 50
    `;
    const { rows } = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error("🚫 /api/employer/jobseekers error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Completed jobs (employments)
app.get("/api/employer/completed-jobs", async (req, res) => {
  try {
    const hasEmployments = await hasTable(pool, "employments");
    const hasJobApplications = await hasTable(pool, "job_applications");
    const hasJobposts = await hasTable(pool, "jobposts");
    if (!hasEmployments || !hasJobApplications || !hasJobposts) return res.json([]);
    const hasEmploymentCreated = await hasColumn(pool, "employments", "created_at");
    const hasEmploymentStatus = await hasColumn(pool, "employments", "employment_status");
    const orderExpr = hasEmploymentCreated ? "e.created_at" : "ja.applied_at";
    const { employer_id } = req.query;
    const employerFilter = employer_id ? "AND jp.employer_id = $1" : "";
    const params = employer_id ? [employer_id] : [];
    const titleExpr = await getJobTitleExpression(pool);
    const provinceExpr = "COALESCE(p_direct.name_th, p_district.name_th, p_sd.name_th, '-')";
    const completedFilter = hasEmploymentStatus
      ? "AND LOWER(COALESCE(e.employment_status::text, '')) IN ('completed', 'inactive')"
      : "";

    const sql = `
      SELECT
        e.employment_id,
        ${titleExpr} AS title,
        ${provinceExpr} AS province,
        ja.applied_at::date AS applied_at,
        ${hasEmploymentCreated ? "e.created_at::date" : "NULL"} AS hired_at
      FROM employments e
      JOIN job_applications ja ON e.job_application_id = ja.job_application_id
      JOIN jobposts jp ON ja.jobpost_id = jp.jobpost_id
      JOIN job_types jt ON jp.job_type_id = jt.job_type_id
      LEFT JOIN provinces p_direct ON p_direct.id = jp.province_id
      LEFT JOIN districts d_direct ON d_direct.id = jp.district_id
      LEFT JOIN provinces p_district ON p_district.id = d_direct.province_id
      LEFT JOIN sub_districts sd ON sd.id = jp.sub_district_id
      LEFT JOIN districts d_sd ON d_sd.id = sd.district_id
      LEFT JOIN provinces p_sd ON p_sd.id = d_sd.province_id
      WHERE 1=1 ${employerFilter}
      ${completedFilter}
      ORDER BY ${orderExpr} DESC
      LIMIT 50
    `;
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("🚫 /api/employer/completed-jobs error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Notifications: pending jobposts
app.get("/api/employer/notifications", async (req, res) => {
  try {
    const hasJobposts = await hasTable(pool, "jobposts");
    if (!hasJobposts) return res.json([]);
    const titleExpr = await getJobTitleExpression(pool);
    const { employer_id } = req.query;
    const employerFilter = employer_id ? "AND jp.employer_id = $1" : "";
    const params = employer_id ? [employer_id] : [];

    const sql = `
      SELECT
        jp.jobpost_id,
        ${titleExpr} AS title,
        COALESCE(jp.approval_status::text, 'Unknown'::text) AS status,
        jp.created_at::date AS created_at
      FROM jobposts jp
      JOIN job_types jt ON jp.job_type_id = jt.job_type_id
      WHERE jp.approval_status IS NULL OR jp.approval_status IN ('Pending')
      ${employerFilter}
      ORDER BY jp.created_at DESC
      LIMIT 10
    `;
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("🚫 /api/employer/notifications error:", err);
    res.status(500).json({ error: err.message });
  }
});

// KPI summary for employer dashboard
app.get("/api/employer/kpis", async (req, res) => {
  try {
    const { employer_id } = req.query;

    const employerFilter = employer_id ? "AND jp.employer_id = $1" : "";
    const params = employer_id ? [employer_id] : [];

    const hasWorkersNeeded = await hasColumn(pool, "jobposts", "workers_needed");
    const hasEmploymentStatus = await hasColumn(pool, "employments", "employment_status");

    const sql = `
      WITH jp AS (
        SELECT * FROM jobposts jp ${employerFilter ? "WHERE 1=1 " + employerFilter : ""}
      ),
      apps AS (
        SELECT COUNT(*)::int AS total_apps
        FROM job_applications ja
        JOIN jp ON ja.jobpost_id = jp.jobpost_id
      ),
      hires AS (
        SELECT COUNT(*)::int AS total_hired
        FROM employments e
        JOIN job_applications ja ON e.job_application_id = ja.job_application_id
        JOIN jp ON ja.jobpost_id = jp.jobpost_id
      ),
      completed AS (
        SELECT COUNT(*)::int AS total_completed
        FROM employments e
        JOIN job_applications ja ON e.job_application_id = ja.job_application_id
        JOIN jp ON ja.jobpost_id = jp.jobpost_id
        ${hasEmploymentStatus ? "WHERE LOWER(COALESCE(e.employment_status::text, '')) IN ('completed', 'inactive')" : ""}
      )
      SELECT
        (SELECT COUNT(*) FROM jp WHERE approval_status = 'Approved')::int AS active_jobs,
        (SELECT total_apps FROM apps) AS total_applications,
        (SELECT total_hired FROM hires) AS workers_hired,
        (SELECT total_completed FROM completed) AS completed_jobs,
        ${hasWorkersNeeded
        ? "GREATEST((SELECT COALESCE(SUM(workers_needed),0) FROM jp) - (SELECT total_hired FROM hires), 0)::int AS open_positions"
        : "0 AS open_positions"
      }
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows[0]);
  } catch (err) {
    console.error("🚫 /api/employer/kpis error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Applications trend (last 14 days)
app.get("/api/employer/applications/trend", async (req, res) => {
  try {
    const { employer_id } = req.query;
    const employerFilter = employer_id ? "AND jp.employer_id = $1" : "";
    const params = employer_id ? [employer_id] : [];

    const sql = `
      SELECT
        to_char(date(ja.applied_at), 'YYYY-MM-DD') AS day,
        COUNT(*)::int AS applications
      FROM job_applications ja
      JOIN jobposts jp ON ja.jobpost_id = jp.jobpost_id
      WHERE ja.applied_at >= NOW() - INTERVAL '14 days'
      ${employerFilter}
      GROUP BY day
      ORDER BY day
    `;
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("🚫 /api/employer/applications/trend error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Hiring funnel
app.get("/api/employer/hiring-funnel", async (req, res) => {
  try {
    const { employer_id } = req.query;
    const employerFilter = employer_id ? "AND jp.employer_id = $1" : "";
    const params = employer_id ? [employer_id] : [];
    const applicationStatusExpr = await getApplicationStatusExpression(pool);
    const hasEmploymentStatus = await hasColumn(pool, "employments", "employment_status");

    const sql = `
      SELECT
        (SELECT COUNT(*) FROM job_applications ja JOIN jobposts jp ON ja.jobpost_id = jp.jobpost_id ${employerFilter})::int AS applications,
        ${applicationStatusExpr
        ? `(SELECT COUNT(*) FROM job_applications ja JOIN jobposts jp ON ja.jobpost_id = jp.jobpost_id ${employerFilter} AND LOWER(COALESCE(${applicationStatusExpr}::text, '')) = 'approved')::int`
        : "0"
      } AS approved,
        (SELECT COUNT(*) FROM employments e JOIN job_applications ja ON e.job_application_id = ja.job_application_id JOIN jobposts jp ON ja.jobpost_id = jp.jobpost_id ${employerFilter})::int AS hired,
        ${hasEmploymentStatus
        ? `(SELECT COUNT(*) FROM employments e JOIN job_applications ja ON e.job_application_id = ja.job_application_id JOIN jobposts jp ON ja.jobpost_id = jp.jobpost_id ${employerFilter} AND LOWER(COALESCE(e.employment_status::text, '')) IN ('completed', 'inactive'))::int`
        : "0"
      } AS completed
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows[0]);
  } catch (err) {
    console.error("🚫 /api/employer/hiring-funnel error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Job status distribution
app.get("/api/employer/job-status", async (req, res) => {
  try {
    const { employer_id } = req.query;
    const employerFilter = employer_id ? "AND jp.employer_id = $1" : "";
    const params = employer_id ? [employer_id] : [];

    const sql = `
      SELECT
        COALESCE(jp.approval_status::text, 'Unknown') AS status,
        COUNT(*)::int AS total
      FROM jobposts jp
      WHERE 1=1 ${employerFilter ? " " + employerFilter : ""}
      GROUP BY status
      ORDER BY total DESC
    `;
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("🚫 /api/employer/job-status error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Active workers (employments)
app.get("/api/employer/active-workers", async (req, res) => {
  try {
    const { employer_id } = req.query;
    const employerFilter = employer_id ? "AND jp.employer_id = $1" : "";
    const params = employer_id ? [employer_id] : [];

    const sql = `
      SELECT
        e.employment_id,
        ja.job_seeker_id,
        jt.job_type AS title,
        p.name_th AS province,
        ja.applied_at::date AS applied_at
      FROM employments e
      JOIN job_applications ja ON e.job_application_id = ja.job_application_id
      JOIN jobposts jp ON ja.jobpost_id = jp.jobpost_id
      JOIN job_types jt ON jp.job_type_id = jt.job_type_id
      JOIN sub_districts sd ON jp.sub_district_id = sd.id
      JOIN districts d ON sd.district_id = d.id
      JOIN provinces p ON d.province_id = p.id
      WHERE 1=1 ${employerFilter ? employerFilter : ""}
      ${await hasColumn(pool, "employments", "employment_status") ? "AND e.employment_status ILIKE 'active'" : ""}
      ORDER BY ja.applied_at DESC
      LIMIT 30
    `;
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("🚫 /api/employer/active-workers error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Jobpost summary: per-jobpost aggregation for pie chart
app.get("/api/employer/jobpost-summary", async (req, res) => {
  try {
    const { employer_id } = req.query;
    if (!employer_id) return res.status(400).json({ error: "employer_id required" });
    const jobTitleExpr = await getJobTitleExpression(pool);

    const sql = `
      SELECT
        jp.jobpost_id,
        ${jobTitleExpr} AS job_title,
        jt.job_type,
        COUNT(DISTINCT ja.job_application_id)::int AS applicant_count,
        COALESCE(SUM(e.agreed_wage), 0)::float AS total_agreed_wage
      FROM jobposts jp
      JOIN job_types jt ON jp.job_type_id = jt.job_type_id
      LEFT JOIN job_applications ja ON ja.jobpost_id = jp.jobpost_id
      LEFT JOIN employments e ON e.job_application_id = ja.job_application_id
      WHERE jp.employer_id = $1
      GROUP BY jp.jobpost_id, ${jobTitleExpr}, jt.job_type
      ORDER BY total_agreed_wage DESC
    `;
    const { rows } = await pool.query(sql, [employer_id]);
    res.json(rows);
  } catch (err) {
    console.error("🚫 /api/employer/jobpost-summary error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Employment timeline: for quartile bar chart
app.get("/api/employer/employment-timeline", async (req, res) => {
  try {
    const { employer_id } = req.query;
    if (!employer_id) return res.status(400).json({ error: "employer_id required" });
    const safeTitleExpr = await getJobTitleExpression(pool);

    const sql = `
      SELECT
        jp.jobpost_id,
        ${safeTitleExpr} AS title,
        jt.job_type,
        COUNT(e.employment_id)::int AS employment_count,
        MIN(e.start_date) AS earliest_start,
        MAX(e.end_date) AS latest_end,
        COALESCE(SUM(e.agreed_wage), 0)::float AS total_agreed_wage,
        e.employment_status
      FROM employments e
      JOIN job_applications ja ON e.job_application_id = ja.job_application_id
      JOIN jobposts jp ON ja.jobpost_id = jp.jobpost_id
      JOIN job_types jt ON jp.job_type_id = jt.job_type_id
      WHERE jp.employer_id = $1
      GROUP BY jp.jobpost_id, ${safeTitleExpr}, jt.job_type, e.employment_status
      ORDER BY total_agreed_wage DESC
    `;
    const { rows } = await pool.query(sql, [employer_id]);

    // Also compute overall summary
    const summarySql = `
      SELECT
        MIN(e.start_date) AS overall_start,
        MAX(e.end_date) AS overall_end,
        COALESCE(SUM(e.agreed_wage), 0)::float AS grand_total_wage,
        COUNT(e.employment_id)::int AS total_employments
      FROM employments e
      JOIN job_applications ja ON e.job_application_id = ja.job_application_id
      JOIN jobposts jp ON ja.jobpost_id = jp.jobpost_id
      WHERE jp.employer_id = $1
    `;
    const { rows: summaryRows } = await pool.query(summarySql, [employer_id]);

    res.json({ timeline: rows, summary: summaryRows[0] });
  } catch (err) {
    console.error("🚫 /api/employer/employment-timeline error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Recent applications
app.get("/api/employer/recent-applications", async (req, res) => {
  try {
    const { employer_id, jobpost_id } = req.query;
    const params = [];
    let filters = "WHERE 1=1";
    const seekerIdExpr = await getApplicationSeekerIdExpression(pool);
    const profileJoinCondition = await getProfileJoinCondition(pool);
    const jobTitleExpr = await getJobTitleExpression(pool);
    const provinceExpr = "COALESCE(p_direct.name_th, p_district.name_th, p_sd.name_th, '-')";

    if (employer_id) {
      params.push(employer_id);
      filters += ` AND jp.employer_id = $${params.length}`;
    }
    if (jobpost_id) {
      params.push(jobpost_id);
      filters += ` AND jp.jobpost_id = $${params.length}`;
    }

    const sql = `
      SELECT
        ja.job_application_id,
        ${seekerIdExpr} AS job_seeker_id,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', pr.first_name, pr.last_name)), ''), ${seekerIdExpr}::text) AS applicant_name,
        jp.jobpost_id,
        ${jobTitleExpr} AS job_title,
        ja.applied_at::date AS applied_at,
        ${provinceExpr} AS province
      FROM job_applications ja
      LEFT JOIN job_seekers js ON ${seekerIdExpr} = js.job_seeker_id
      ${profileJoinCondition ? `LEFT JOIN profiles pr ON ${profileJoinCondition}` : "LEFT JOIN profiles pr ON false"}
      JOIN jobposts jp ON ja.jobpost_id = jp.jobpost_id
      JOIN job_types jt ON jp.job_type_id = jt.job_type_id
      LEFT JOIN provinces p_direct ON p_direct.id = jp.province_id
      LEFT JOIN districts d_direct ON d_direct.id = jp.district_id
      LEFT JOIN provinces p_district ON p_district.id = d_direct.province_id
      LEFT JOIN sub_districts sd ON sd.id = jp.sub_district_id
      LEFT JOIN districts d_sd ON d_sd.id = sd.district_id
      LEFT JOIN provinces p_sd ON p_sd.id = d_sd.province_id
      ${filters}
      ORDER BY ja.applied_at DESC
      LIMIT 50
    `;
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("🚫 /api/employer/recent-applications error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Applicants daily counts (7 days)
app.get("/api/employer/applicants/daily", async (req, res) => {
  try {
    const hasJobApplications = await hasTable(pool, "job_applications");
    if (!hasJobApplications) return res.json([]);
    const { employer_id } = req.query;
    const employerFilter = employer_id ? "AND jp.employer_id = $1" : "";
    const params = employer_id ? [employer_id] : [];

    const sql = `
      SELECT
        to_char(date(ja.applied_at), 'YYYY-MM-DD') AS day,
        COUNT(*)::int AS applications
      FROM job_applications ja
      ${employer_id ? "JOIN jobposts jp ON ja.jobpost_id = jp.jobpost_id" : ""}
      WHERE ja.applied_at >= NOW() - INTERVAL '7 days'
      ${employerFilter}
      GROUP BY day
      ORDER BY day
    `;
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("🚫 /api/employer/applicants/daily error:", err);
    res.status(500).json({ error: err.message });
  }
});

// API Endpoint for NeonDB Export (Employer focus)
app.get("/api/neon/export-data", async (req, res) => {
  try {
    const rolesRes = await pool.query(`SELECT * FROM roles WHERE rolename ILIKE '%employer%'`);
    const employerRoleId = rolesRes.rows.length > 0 ? rolesRes.rows[0].role_id : null;

    let profiles = [];
    if (employerRoleId) {
      const profilesRes = await pool.query(`SELECT * FROM profiles WHERE role_id = $1`, [employerRoleId]);
      profiles = profilesRes.rows;
    }

    const employersRes = await pool.query(`SELECT * FROM employers`);
    const jobpostsRes = await pool.query(`SELECT * FROM jobposts`);
    const jobAppsRes = await pool.query(`SELECT * FROM job_applications`);
    const jobTypesRes = await pool.query(`SELECT * FROM job_types`);

    res.json({
      profiles,
      employers: employersRes.rows,
      jobposts: jobpostsRes.rows,
      job_applications: jobAppsRes.rows,
      job_types: jobTypesRes.rows
    });
  } catch (err) {
    console.error("❌ /api/neon/export-data error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Serve Employer dashboard build (after API routes)
const employerDist = path.join(__dirname, 'employer-dashboard', 'dist');
app.use('/employer', express.static(employerDist));
app.get('/employer', (req, res) => {
  res.sendFile(path.join(employerDist, 'index.html'));
});
app.get(/^\/employer(?:\/.*)?$/, (req, res) => {
  res.sendFile(path.join(employerDist, 'index.html'));
});

// Redirect root to employer dashboard
app.get('/', (req, res) => {
  res.redirect('/employer');
});

app.listen(3000, () => {
  console.log('✅ API connected to Neon at http://localhost:3000');
});
