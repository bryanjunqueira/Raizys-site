<?php
/* ============================================================
   RAIZYS - NOTIFICACAO DE LEAD DO WIDGET WTS CHAT
   ------------------------------------------------------------
   Endpoint DEDICADO ao formulario que abre no botao de WhatsApp
   da LP gestao-web. Existe separado do send_mail.php de proposito:
   assim nenhum formulario do site pode ser afetado por mudancas
   aqui, e vice-versa.

   Os destinatarios sao fixos neste arquivo e NUNCA vem do POST.
   Aceitar destinatario do navegador transformaria este script em
   relay aberto para spam.
   ============================================================ */

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    exit;
}

// ---------- Destinatarios (fixos) ----------
$to = 'thiago.jaques@raizys.com.br';
$cc = 'expansao@raizys.com.br';

$subject = 'Novo Lead do WhatsApp - LP Gestão Web';

// ---------- Limites, para nao virar porta de abuso ----------
$MAX_CAMPOS = 40;
$MAX_TAMANHO_CAMPO = 2000;

$dados = array();
$i = 0;
foreach ($_POST as $chave => $valor) {
    if ($i++ >= $MAX_CAMPOS) break;
    if (strpos($chave, '_') === 0) continue;          // campos internos
    if (is_array($valor)) $valor = implode(', ', $valor);
    $valor = trim((string) $valor);
    if ($valor === '') continue;
    $dados[substr((string) $chave, 0, 100)] = substr($valor, 0, $MAX_TAMANHO_CAMPO);
}

if (empty($dados)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nenhum dado recebido']);
    exit;
}

// ---------- E-mail de resposta, se o lead informou um ----------
// Validado de forma estrita: vai para um header, entao nao pode
// conter quebra de linha (header injection).
$replyTo = '';
foreach ($dados as $chave => $valor) {
    if (stripos($chave, 'mail') !== false && filter_var($valor, FILTER_VALIDATE_EMAIL)) {
        $replyTo = $valor;
        break;
    }
}
if ($replyTo !== '' && preg_match('/[\r\n]/', $replyTo)) {
    $replyTo = '';
}

// ---------- Corpo ----------
$linhas = '';
foreach ($dados as $chave => $valor) {
    $rotulo = ucfirst(str_replace(array('_', '-'), ' ', $chave));
    $linhas .= '<tr><th>' . htmlspecialchars($rotulo, ENT_QUOTES, 'UTF-8') . '</th>'
             . '<td>' . nl2br(htmlspecialchars($valor, ENT_QUOTES, 'UTF-8')) . '</td></tr>';
}

$origem = isset($_POST['_pagina']) ? substr((string) $_POST['_pagina'], 0, 300) : '';

$bodyHtml = "
<!DOCTYPE html>
<html>
<head><meta charset='utf-8'>
<style>
    body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .header { background: #1a3c25; color: #ffffff; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #edf2f7; }
    th { background-color: #f7fafc; width: 35%; color: #4a5568; }
    .footer { background: #f7fafc; padding: 15px; text-align: center; font-size: 12px; color: #a0aec0; }
</style>
</head>
<body>
    <div class='container'>
        <div class='header'><h2 style='margin:0;'>" . htmlspecialchars($subject, ENT_QUOTES, 'UTF-8') . "</h2></div>
        <div class='content'>
            <p>Um novo lead preencheu o formulário do atendimento (widget WhatsApp) na LP Gestão Web:</p>
            <table>{$linhas}</table>
        </div>
        <div class='footer'>
            <p>Enviado automaticamente por <a href='https://raizys.com.br'>raizys.com.br</a>"
            . ($origem !== '' ? ' &middot; ' . htmlspecialchars($origem, ENT_QUOTES, 'UTF-8') : '') . "</p>
        </div>
    </div>
</body>
</html>";

// ---------- Envio ----------
$headers = array();
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-type: text/html; charset=utf-8';
$headers[] = 'From: Raizys Site <contato@raizys.com.br>';
if ($replyTo !== '') {
    $headers[] = 'Reply-To: ' . $replyTo;
}
$headers[] = 'Cc: ' . $cc;

$enviado = @mail($to, $subject, $bodyHtml, implode("\r\n", $headers));

if (!$enviado) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Falha ao enviar o e-mail']);
    exit;
}

echo json_encode(['success' => true]);
