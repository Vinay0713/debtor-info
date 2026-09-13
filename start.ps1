# Starts the bankruptcy intake app, pointed at the portable local Postgres
# instance (run pg/start.ps1 first if it's not already running).
$env:PGHOST = "127.0.0.1"
$env:PGPORT = "5432"
$env:PGUSER = "postgres"
$env:PGDATABASE = "bankruptcy_app"

Set-Location -Path (Split-Path -Parent $MyInvocation.MyCommand.Path)
node server.js
