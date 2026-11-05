param([switch] $RebuildV110, [switch] $RpcExecuteOnly, [switch] $RefinementOnly)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Join-Path $PSScriptRoot '..')
# Read-Host keeps credentials out of command history and process arguments.
$adminEmail = Read-Host 'Admin email' -AsSecureString
$adminPassword = Read-Host 'Admin password' -AsSecureString
$userEmail = Read-Host 'Non-admin email' -AsSecureString
$userPassword = Read-Host 'Non-admin password' -AsSecureString
function Reveal([Security.SecureString] $value) {
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($value)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}
try {
  $payload = @{ adminEmail=(Reveal $adminEmail); adminPassword=(Reveal $adminPassword); userEmail=(Reveal $userEmail); userPassword=(Reveal $userPassword) } | ConvertTo-Json -Compress
  $runner = if ($RefinementOnly) { 'scripts/refinement-live.mjs' } elseif ($RpcExecuteOnly) { 'scripts/rpc-execute-live.mjs' } elseif ($RebuildV110) { 'scripts/rebuild-live.mjs' } else { 'scripts/auth-live.mjs' }
  $payload | node --env-file=.env.local $runner
  $result = $LASTEXITCODE
} finally {
  $payload = $null
  $adminEmail.Dispose(); $adminPassword.Dispose(); $userEmail.Dispose(); $userPassword.Dispose()
}
exit $result
