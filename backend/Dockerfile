FROM php:8.4-apache

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    unzip \
    libpq-dev \
    libicu-dev \
    libzip-dev \
    libonig-dev \
    libcurl4-openssl-dev \
    && docker-php-ext-install -j$(nproc) \
        pdo_pgsql \
        bcmath \
        intl \
        mbstring \
        curl \
        zip \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock ./

RUN composer install \
    --no-dev \
    --no-interaction \
    --prefer-dist \
    --optimize-autoloader \
    --no-scripts

COPY . .

RUN mkdir -p \
        storage/framework/cache \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rwx storage bootstrap/cache \
    && composer dump-autoload --optimize \
    && php artisan package:discover --ansi

RUN sed -ri \
        -e 's!/var/www/html!/var/www/html/public!g' \
        /etc/apache2/sites-available/*.conf \
    && sed -ri \
        -e 's!Listen 80!Listen 10000!g' \
        /etc/apache2/ports.conf \
    && sed -ri \
        -e 's!:80>!:10000>!g' \
        /etc/apache2/sites-available/*.conf \
    && sed -ri \
        -e '/<Directory \/var\/www\/>/,/<\/Directory>/ s/AllowOverride None/AllowOverride All/' \
        /etc/apache2/apache2.conf

EXPOSE 10000

CMD ["sh", "-c", "php artisan migrate --force && php artisan config:cache && apache2-foreground"]