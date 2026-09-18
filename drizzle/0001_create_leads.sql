CREATE TABLE leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  interest TEXT NOT NULL,
  consented_at TEXT NOT NULL
);
CREATE INDEX idx_leads_consented_at ON leads(consented_at);
