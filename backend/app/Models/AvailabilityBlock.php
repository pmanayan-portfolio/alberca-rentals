<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class AvailabilityBlock extends Model
{
 protected $fillable=['start_at','end_at','reason','is_all_day'];
 protected $casts=['start_at'=>'datetime','end_at'=>'datetime','is_all_day'=>'boolean'];
}
