<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class RentalCategory extends Model{protected $fillable=['name','slug','description','sort_order','is_active'];protected $casts=['is_active'=>'boolean'];public function items(){return $this->hasMany(RentalItem::class);}}
