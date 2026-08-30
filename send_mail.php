<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Accept');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    exit;
}

// Destination configuration
$to = 'diego.caselato@raizys.com.br';
$cc = 'expansao@raizys.com.br, luciano.jacob@raizys.com.br';

$subject = isset($_POST['_subject']) && !empty($_POST['_subject']) ? trim($_POST['_subject']) : 'Novo Contato do Site - Raizys';

// Locate user email from POST
$userEmail = '';
if (isset($_POST['email']) && !empty($_POST['email'])) {
    $userEmail = filter_var(trim($_POST['email']), FILTER_SANITIZE_EMAIL);
} elseif (isset($_POST['email_contato']) && !empty($_POST['email_contato'])) {
    $userEmail = filter_var(trim($_POST['email_contato']), FILTER_SANITIZE_EMAIL);
} elseif (isset($_POST['email_indicacao']) && !empty($_POST['email_indicacao'])) {
    $userEmail = filter_var(trim($_POST['email_indicacao']), FILTER_SANITIZE_EMAIL);
}

$autoResponseMsg = isset($_POST['_autoresponse']) ? trim($_POST['_autoresponse']) : '';

// Check for file attachments in $_FILES
$attachments = array();
if (!empty($_FILES)) {
    foreach ($_FILES as $fileKey => $fileInfo) {
        if (isset($fileInfo['tmp_name']) && is_uploaded_file($fileInfo['tmp_name']) && $fileInfo['error'] === UPLOAD_ERR_OK) {
            $attachments[] = array(
                'name' => $fileInfo['name'],
                'tmp_name' => $fileInfo['tmp_name'],
                'type' => !empty($fileInfo['type']) ? $fileInfo['type'] : 'application/octet-stream'
            );
        }
    }
}

// Build HTML email content table
$bodyHtml = "
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <style>
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
        .container { max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
        .header { background: #1a3c25; color: #ffffff; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #edf2f7; }
        th { background-color: #f7fafc; width: 35%; color: #4a5568; }
        .footer { background: #f7fafc; padding: 15px; text-align: center; font-size: 12px; color: #a0aec0; }
        .att-badge { display: inline-block; background: #e2e8f0; color: #2d3748; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h2 style='margin:0;'>".htmlspecialchars($subject)."</h2>
        </div>
        <div class='content'>
            <p>Um novo formulário foi preenchido no site Raizys:</p>
            <table>";

foreach ($_POST as $key => $value) {
    if (strpos($key, '_') === 0) continue; // Skip internal fields like _subject, _captcha, _template, _cc
    
    $cleanKey = ucfirst(str_replace(['_', '-'], ' ', $key));
    $cleanVal = is_array($value) ? implode(', ', array_map('htmlspecialchars', (array)$value)) : nl2br(htmlspecialchars($value));
    
    $bodyHtml .= "<tr><th>{$cleanKey}</th><td>{$cleanVal}</td></tr>";
}

if (!empty($attachments)) {
    $attNames = array_map(function($a) { return htmlspecialchars($a['name']); }, $attachments);
    $bodyHtml .= "<tr><th>Arquivo Anexo</th><td><span class='att-badge'>📎 ".implode(', ', $attNames)."</span></td></tr>";
}

$bodyHtml .= "
            </table>
        </div>
        <div class='footer'>
            <p>Mensagem enviada automaticamente pelo site <a href='https://raizys.com.br'>raizys.com.br</a></p>
        </div>
    </div>
</body>
</html>";

// Send main notification email with or without attachment
if (!empty($attachments)) {
    $boundary = "----=" . md5(time() . rand());
    
    $headers = array();
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = 'From: Raizys Site <contato@raizys.com.br>';
    if (!empty($userEmail) && filter_var($userEmail, FILTER_VALIDATE_EMAIL)) {
        $headers[] = 'Reply-To: ' . $userEmail;
    }
    $headers[] = 'Cc: ' . $cc;
    $headers[] = 'Content-Type: multipart/mixed; boundary="' . $boundary . '"';

    $message = "--" . $boundary . "\r\n";
    $message .= "Content-Type: text/html; charset=UTF-8\r\n";
    $message .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $message .= $bodyHtml . "\r\n\r\n";

    foreach ($attachments as $att) {
        $fileContent = chunk_split(base64_encode(file_get_contents($att['tmp_name'])));
        $fileName = basename($att['name']);
        
        $message .= "--" . $boundary . "\r\n";
        $message .= "Content-Type: " . $att['type'] . "; name=\"" . $fileName . "\"\r\n";
        $message .= "Content-Transfer-Encoding: base64\r\n";
        $message .= "Content-Disposition: attachment; filename=\"" . $fileName . "\"\r\n\r\n";
        $message .= $fileContent . "\r\n\r\n";
    }
    
    $message .= "--" . $boundary . "--";
    
    $successMain = @mail($to, $subject, $message, implode("\r\n", $headers));
} else {
    $headers = array();
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = 'Content-type: text/html; charset=utf-8';
    $headers[] = 'From: Raizys Site <contato@raizys.com.br>';
    if (!empty($userEmail) && filter_var($userEmail, FILTER_VALIDATE_EMAIL)) {
        $headers[] = 'Reply-To: ' . $userEmail;
    }
    $headers[] = 'Cc: ' . $cc;

    $successMain = @mail($to, $subject, $bodyHtml, implode("\r\n", $headers));
}

// Send autoresponder to user if valid email found
if (!empty($userEmail) && filter_var($userEmail, FILTER_VALIDATE_EMAIL) && !empty($autoResponseMsg)) {
    $autoHeaders = array();
    $autoHeaders[] = 'MIME-Version: 1.0';
    $autoHeaders[] = 'Content-type: text/html; charset=utf-8';
    $autoHeaders[] = 'From: Raizys Consultoria <contato@raizys.com.br>';
    
    $autoHtml = "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='utf-8'>
        <style>
            body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
            .card { max-width: 600px; margin: 20px auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 10px; background: #ffffff; }
            .brand { color: #1a3c25; font-size: 20px; font-weight: bold; margin-bottom: 15px; }
            .msg { font-size: 15px; color: #4a5568; line-height: 1.7; }
            .footer { margin-top: 25px; padding-top: 15px; border-top: 1px solid #edf2f7; font-size: 12px; color: #718096; }
        </style>
    </head>
    <body>
        <div class='card'>
            <div class='brand'>RAIZYS | Consultoria & Tecnologia</div>
            <div class='msg'>".nl2br(htmlspecialchars($autoResponseMsg))."</div>
            <div class='footer'>
                <p>Atenciosamente,<br><strong>Equipe Raizys</strong><br><a href='https://raizys.com.br' style='color:#4a6d3c;'>raizys.com.br</a></p>
            </div>
        </div>
    </body>
    </html>";

    @mail($userEmail, "Recebemos seu formulário - Raizys", $autoHtml, implode("\r\n", $autoHeaders));
}

echo json_encode([
    'success' => true,
    'message' => 'Formulário enviado com sucesso!'
]);
