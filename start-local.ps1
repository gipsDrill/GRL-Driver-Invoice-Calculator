$ErrorActionPreference = "Stop"

$root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$port = 8765
$prefix = "http://localhost:$port/"
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)

$mimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".js" = "text/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".webmanifest" = "application/manifest+json; charset=utf-8"
  ".svg" = "image/svg+xml"
  ".png" = "image/png"
  ".jpg" = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".pdf" = "application/pdf"
  ".txt" = "text/plain; charset=utf-8"
}

try {
  $listener.Start()
  Start-Process $prefix
  Write-Host ""
  Write-Host "GRL Driver Pay & Invoices is running at $prefix" -ForegroundColor Green
  Write-Host "Keep this window open while using the calculator." -ForegroundColor Yellow
  Write-Host "Press Ctrl+C to stop." -ForegroundColor Yellow
  Write-Host ""

  while ($listener.IsListening) {
    $context = $listener.GetContext()
    try {
      $relativePath = [System.Uri]::UnescapeDataString(
        $context.Request.Url.AbsolutePath.TrimStart("/")
      )
      if ([string]::IsNullOrWhiteSpace($relativePath)) {
        $relativePath = "index.html"
      }

      $relativePath = $relativePath.Replace("/", [System.IO.Path]::DirectorySeparatorChar)
      $requestedPath = [System.IO.Path]::GetFullPath(
        [System.IO.Path]::Combine($root, $relativePath)
      )

      if (
        -not $requestedPath.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase) -or
        -not [System.IO.File]::Exists($requestedPath)
      ) {
        $context.Response.StatusCode = 404
        $body = [System.Text.Encoding]::UTF8.GetBytes("404 - File not found")
      } else {
        $extension = [System.IO.Path]::GetExtension($requestedPath).ToLowerInvariant()
        $context.Response.ContentType = if ($mimeTypes.ContainsKey($extension)) {
          $mimeTypes[$extension]
        } else {
          "application/octet-stream"
        }
        $body = [System.IO.File]::ReadAllBytes($requestedPath)
        $context.Response.StatusCode = 200
      }

      $context.Response.ContentLength64 = $body.Length
      $context.Response.OutputStream.Write($body, 0, $body.Length)
    } finally {
      $context.Response.OutputStream.Close()
    }
  }
} finally {
  if ($listener.IsListening) {
    $listener.Stop()
  }
  $listener.Close()
}
