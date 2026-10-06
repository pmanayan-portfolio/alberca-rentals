<?php
namespace Database\Seeders;use App\Models\Event;use App\Models\Promotion;use App\Models\RentalCategory;use App\Models\RentalItem;use Illuminate\Database\Seeder;
class RentalDemoSeeder extends Seeder
{
 public function run():void{
  $tables=RentalCategory::firstOrCreate(['slug'=>'tables'],['name'=>'Tables','sort_order'=>10]);$chairs=RentalCategory::firstOrCreate(['slug'=>'chairs'],['name'=>'Chairs','sort_order'=>20]);$gowns=RentalCategory::firstOrCreate(['slug'=>'gowns-dresses'],['name'=>'Gowns & Dresses','sort_order'=>30]);$decor=RentalCategory::firstOrCreate(['slug'=>'decorations'],['name'=>'Decorations','sort_order'=>40]);
  $table=RentalItem::updateOrCreate(['slug'=>'round-table'],['rental_category_id'=>$tables->id,'name'=>'Round Table','description'=>'Classic round banquet table.','base_price'=>500,'total_stock'=>20,'minimum_quantity'=>1,'maximum_quantity'=>20,'track_variants'=>false,'status'=>'available','is_active'=>true]);
  $chair=RentalItem::updateOrCreate(['slug'=>'monoblock-chair'],['rental_category_id'=>$chairs->id,'name'=>'Monoblock Chair','description'=>'Clean event chair suitable for ceremonies and receptions.','base_price'=>50,'total_stock'=>150,'minimum_quantity'=>1,'maximum_quantity'=>150,'track_variants'=>false,'status'=>'available','is_active'=>true]);
  $cloth=RentalItem::updateOrCreate(['slug'=>'white-table-cloth'],['rental_category_id'=>$decor->id,'name'=>'White Table Cloth','description'=>'White event table linen.','base_price'=>100,'total_stock'=>30,'minimum_quantity'=>1,'maximum_quantity'=>30,'track_variants'=>false,'status'=>'available','is_active'=>true]);
  $gown=RentalItem::updateOrCreate(['slug'=>'aurora-wedding-gown'],['rental_category_id'=>$gowns->id,'name'=>'Aurora Wedding Gown','description'=>'Elegant bridal gown available in multiple sizes.','base_price'=>5000,'total_stock'=>4,'minimum_quantity'=>1,'maximum_quantity'=>1,'track_variants'=>true,'status'=>'available','is_active'=>true]);
  $gown->variants()->delete();foreach([['Small',1],['Medium',2],['Large',1]] as [$name,$stock])$gown->variants()->create(['name'=>$name,'sku'=>'AUR-'.strtoupper(substr($name,0,1)),'stock_quantity'=>$stock,'price_adjustment'=>0,'is_active'=>true]);
  Event::updateOrCreate(['slug'=>'wedding-celebration'],['title'=>'Wedding Celebration','description'=>'Complete planning and coordination experience for an elegant celebration.','base_price'=>25000,'duration_hours'=>8,'is_active'=>true,'featured'=>true]);
  $promo=Promotion::updateOrCreate(['slug'=>'wedding-essentials-flash-deal'],['title'=>'Wedding Essentials Flash Deal','description'=>'A limited-time package with tables, chairs and linens.','discount_type'=>'fixed','discount_value'=>200,'booking_starts_at'=>now()->subDay(),'booking_ends_at'=>now()->addDays(2),'rental_start_date'=>now()->addDays(10)->toDateString(),'rental_end_date'=>now()->addDays(10)->toDateString(),'max_redemptions'=>10,'is_active'=>true,'featured'=>true]);
  $promo->items()->delete();$promo->items()->createMany([['rental_item_id'=>$table->id,'quantity'=>10],['rental_item_id'=>$chair->id,'quantity'=>80],['rental_item_id'=>$cloth->id,'quantity'=>10]]);
 }
}
