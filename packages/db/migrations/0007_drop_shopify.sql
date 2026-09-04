-- Fuera Shopify (decisión del dueño, 2026-09-03): la verdad es Meta. Revierte 0005 y la tabla de 0001.
drop table if exists shopify_daily;
alter table accounts drop column if exists shopify_domain;
