<?php
return [
 'paths'=>['api/*','sanctum/csrf-cookie','storage/*'],
 'allowed_methods'=>['*'],
 'allowed_origins'=>array_values(array_filter(array_unique([
   env('FRONTEND_URL','http://localhost:5174'),
   'http://localhost:5174','http://127.0.0.1:5174'
 ]))),
 'allowed_origins_patterns'=>['#^http://192\\.168\\.\\d{1,3}\\.\\d{1,3}:5174$#'],
 'allowed_headers'=>['*'],
 'exposed_headers'=>[],
 'max_age'=>0,
 'supports_credentials'=>true,
];
