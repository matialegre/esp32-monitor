# Script para instalar y configurar Mosquitto

# Verificar si Mosquitto está instalado
$mosquittoInstalled = Get-Service -Name "Mosquitto" -ErrorAction SilentlyContinue

if (-not $mosquittoInstalled) {
    # Descargar Mosquitto
    Write-Host "Descargando Mosquitto..."
    Invoke-WebRequest -Uri "https://github.com/eclipse/mosquitto/releases/download/v2.0.19/mosquitto-2.0.19-install-windows-x64.exe" -OutFile "mosquitto-installer.exe"
    
    # Instalar Mosquitto
    Write-Host "Instalando Mosquitto..."
    Start-Process -FilePath "mosquitto-installer.exe" -ArgumentList "/S" -Wait
    
    # Eliminar archivo de instalación
    Remove-Item "mosquitto-installer.exe"
}

# Configurar el servicio para iniciar automáticamente
Write-Host "Configurando servicio Mosquitto..."
Set-Service -Name "Mosquitto" -StartupType Automatic
Start-Service -Name "Mosquitto"

# Mostrar estado del servicio
Write-Host "Estado del servicio Mosquitto:"
Get-Service -Name "Mosquitto"

Write-Host "`nMosquitto está listo para usar!"
Write-Host "Puerto MQTT: 1883"
Write-Host "Puerto Websocket: 9001"  # Configurado en el archivo de configuración
