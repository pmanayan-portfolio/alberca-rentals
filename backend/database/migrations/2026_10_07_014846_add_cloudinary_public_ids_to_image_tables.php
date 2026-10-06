<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rental_items', function (Blueprint $table) {
            $table->string('cloudinary_public_id')->nullable()->after('image_path');
        });

        Schema::table('rental_item_images', function (Blueprint $table) {
            $table->string('cloudinary_public_id')->nullable()->after('image_path');
        });

        Schema::table('promotions', function (Blueprint $table) {
            $table->string('cloudinary_public_id')->nullable()->after('image_path');
        });

        Schema::table('events', function (Blueprint $table) {
            $table->string('cloudinary_public_id')->nullable()->after('image_path');
        });

        Schema::table('showcase_photos', function (Blueprint $table) {
            $table->string('cloudinary_public_id')->nullable()->after('image_path');
        });
    }

    public function down(): void
    {
        Schema::table('rental_items', function (Blueprint $table) {
            $table->dropColumn('cloudinary_public_id');
        });

        Schema::table('rental_item_images', function (Blueprint $table) {
            $table->dropColumn('cloudinary_public_id');
        });

        Schema::table('promotions', function (Blueprint $table) {
            $table->dropColumn('cloudinary_public_id');
        });

        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn('cloudinary_public_id');
        });

        Schema::table('showcase_photos', function (Blueprint $table) {
            $table->dropColumn('cloudinary_public_id');
        });
    }
};