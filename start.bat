@echo off
title He Thong Quan Ly Thiet Bi SMT - Server
cd /d "%~dp0"
echo ============================================================
echo   HE THONG QUAN LY THIET BI VA LICH SU THAY THE LINH KIEN SMT
echo ============================================================
echo Dang khoi dong may chu tai: http://localhost:3000
echo Nhan Ctrl + C de dung may chu.
echo.
start http://localhost:3000
node server/server.js
pause
