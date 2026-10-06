<?php
namespace App\Services;
class GoogleMapsLinkService
{
 public function directions(?string $address, $lat=null, $lng=null):?string{$destination=($lat!==null&&$lng!==null)?$lat.','.$lng:trim((string)$address);return $destination?('https://www.google.com/maps/dir/?api=1&destination='.rawurlencode($destination)):null;}
}
