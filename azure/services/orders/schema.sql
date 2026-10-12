CREATE TABLE orders (
  id nvarchar(64) NOT NULL PRIMARY KEY,
  status nvarchar(32) NOT NULL,
  quantity int NOT NULL,
  unitPrice decimal(18, 2) NOT NULL,
  createdAt datetime2 NOT NULL
);
