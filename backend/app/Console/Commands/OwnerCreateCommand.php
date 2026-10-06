<?php
namespace App\Console\Commands;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
class OwnerCreateCommand extends Command
{
 protected $signature='owner:create {email} {--name=Store Owner}'; protected $description='Create or update a manager/owner account';
 public function handle():int{$email=(string)$this->argument('email');$password=$this->secret('Password (at least 10 characters):');if(strlen((string)$password)<10){$this->error('Password must be at least 10 characters.');return self::FAILURE;}User::updateOrCreate(['email'=>$email],['name'=>$this->option('name'),'password'=>Hash::make($password),'role'=>'manager']);$this->info('Owner created.');return self::SUCCESS;}
}
