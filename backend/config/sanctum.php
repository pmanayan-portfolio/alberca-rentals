<?php
return [
 'stateful'=>explode(',', env('SANCTUM_STATEFUL_DOMAINS', 'localhost:5174,localhost:8001,127.0.0.1:5174,127.0.0.1:8001,192.168.0.104:5174,192.168.0.104:8001')),
 'guard'=>['web'],
 'expiration'=>null,
 'token_prefix'=>env('SANCTUM_TOKEN_PREFIX',''),
 'middleware'=>[
  'authenticate_session'=>Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
  'encrypt_cookies'=>Illuminate\Cookie\Middleware\EncryptCookies::class,
  'validate_csrf_token'=>Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
 ],
];
