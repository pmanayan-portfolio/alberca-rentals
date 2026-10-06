<?php

use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Foundation\Configuration\Exceptions;

use App\Console\Commands\OwnerCreateCommand;
use App\Console\Commands\MigrateImagesToCloudinaryCommand;
use App\Console\Commands\CleanupLocalImagesCommand;
use App\Http\Middleware\EnsureManager;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        $middleware->alias(['manager' => EnsureManager::class]);
    })
    ->withCommands([
        OwnerCreateCommand::class,
        MigrateImagesToCloudinaryCommand::class,
        CleanupLocalImagesCommand::class,
    ])
    ->withExceptions(function (Exceptions $exceptions): void {
        //
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'message' => 'Unauthenticated.',
                ], 401);
            }

            return null;
        });
    })->create();
