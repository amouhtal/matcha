const { Client } = require("pg");
const client = require("./createDB");
const matchaClient = client.matchaClient;

const createRecord = async (user, table, res) => {
  const data = user;
  const columns = Object.keys(data).join(", ");
  const values = Object.values(data);
  const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

  const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`;
  let dota;

  if (!matchaClient._connected) matchaClient.connect().catch((e) => {});
  try {
    dota = await matchaClient.query(query, values);
    return dota.rows[0];
  } catch (e) {
    console.log(`error from create record ${table} :`, e.message);
    res.status(400).send(e.message);
  }
};

async function getAllRecords(table) {
  const query = `SELECT * FROM ${table}`;
  return db.any(query);
}

async function getRecordById(table, id, res) {
  const query = `SELECT * FROM ${table} WHERE id = $1`;
  if (!matchaClient._connected) matchaClient.connect().catch((e) => {});
  let result = await matchaClient.query(query, [id]);
  return result.rows[0];
}

async function getRecordBy(table, columnName, columnValue, res) {
  const query = `SELECT * FROM ${table} WHERE ${columnName} = $1`;
  if (!matchaClient._connected) matchaClient.connect().catch((e) => {});
  let result = await matchaClient.query(query, [columnValue]).catch((e) => {
    res.status(400).send(e.message);
  });
  return result.rows[0];
}

// Update
const updateRecord = async (table, id, updateObject, res) => {
  const columns = Object.keys(updateObject);
  const values = Object.values(updateObject);
  const setClause = columns.map((col, i) => `${col} = $${i + 2}`).join(", ");

  const query = `UPDATE ${table} SET ${setClause} WHERE id = $1 RETURNING *`;
  if (!matchaClient._connected) matchaClient.connect();
  let result = await matchaClient.query(query, [id, ...values]).catch((e) => {
    res.status(400).send(e.message);
  });
  return result.rows[0];
};

// Delete
async function deleteRecord(table, id, res) {
  const query = `DELETE FROM ${table} WHERE id = $1 RETURNING *`;
  if (!matchaClient._connected) matchaClient.connect().catch((e) => {});
  let result = await matchaClient.query(query, [id]).catch((e) => {
    res.status(400).send(e.message);
  });
  return result.rows[0];
}

module.exports = {
  createRecord,
  getAllRecords,
  updateRecord,
  deleteRecord,
  getRecordById,
  getRecordBy,
};
