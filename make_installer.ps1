$sourceDir = "D:\wamp642\www\filefinder"
$outputExe = "D:\wamp642\www\filefinder_admin\sito_publico\FileFinder-v1.0.9-Setup.exe"

if (Test-Path $outputExe) { Remove-Item $outputExe -Force }

# Prepara file SED per IExpress senza includere il modello pesante da 1.1GB
$sedContent = @"
[Version]
Class=IExpress
SEDVersion=3.0
[Options]
PackagePurpose=ExtractOnly
ShowInstallProgramWindow=0
HideExtractAnimation=0
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=6144
RebootMode=I
InstallPrompt=%InstallPrompt%
DisplayLicense=%DisplayLicense%
FinishMessage=%FinishMessage%
TargetName=%TargetName%
FriendlyName=%FriendlyName%
AppLaunched=%AppLaunched%
PostInstallCmd=%PostInstallCmd%
AdminQuietInstCmd=%AdminQuietInstCmd%
UserQuietInstCmd=%UserQuietInstCmd%
SourceFiles=SourceFiles
[Strings]
InstallPrompt=Vuoi installare FileFinder v1.0.9 (Pacchetto Leggero)?
DisplayLicense=
FinishMessage=FileFinder e stato estratto con successo! Puoi ora eseguire FileFinder.exe.
TargetName=$outputExe
FriendlyName=FileFinder Setup Installer
AppLaunched=
PostInstallCmd=
AdminQuietInstCmd=
UserQuietInstCmd=
[SourceFiles]
SourceFiles0=$sourceDir
[SourceFiles0]
FileFinder.exe=
FileFinder-core.exe=
package.json=
LICENSE=
README.md=
"@

$sedPath = "D:\wamp642\www\filefinder\make_installer.sed"
Set-Content -Path $sedPath -Value $sedContent -Encoding ASCII

C:\Windows\System32\iexpress.exe /N $sedPath
