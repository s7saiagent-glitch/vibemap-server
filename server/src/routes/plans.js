const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM plans ORDER BY id ASC');
    res.json({ plans: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
