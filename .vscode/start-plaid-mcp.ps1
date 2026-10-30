$ErrorActionPreference = "Stop"

$envFile = Join-Path (Split-Path $PSScriptRoot -Parent) ".env.plaid"
if (-not (Test-Path -LiteralPath $envFile)) {
  throw "Plaid credentials file not found: $envFile"
}

$requiredVariables = @("PLAID_CLIENT_ID", "PLAID_SECRET")
$loadedVariables = @{}

foreach ($line in Get-Content -LiteralPath $envFile) {
  if ($line -match '^\s*(?:export\s+)?(PLAID_CLIENT_ID|PLAID_SECRET)\s*=\s*(.*)\s*$') {
    $name = $matches[1]
    $value = $matches[2].Trim()
    if ($value.Length -ge 2 -and
        (($value.StartsWith('"') -and $value.EndsWith('"')) -or
         ($value.StartsWith("'") -and $value.EndsWith("'")))) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    if (-not $value) {
      throw "Plaid credential $name is empty in $envFile"
    }

    Set-Item -Path "Env:$name" -Value $value
    $loadedVariables[$name] = $true
  }
}

foreach ($name in $requiredVariables) {
  if (-not $loadedVariables.ContainsKey($name)) {
    throw "Required Plaid credential $name is missing from $envFile"
  }
}

$uvx = Join-Path $HOME ".local\bin\uvx.exe"
if (-not (Test-Path -LiteralPath $uvx)) {
  throw "uvx executable not found: $uvx"
}

& $uvx mcp-server-plaid
exit $LASTEXITCODE
