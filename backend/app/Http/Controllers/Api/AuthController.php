<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;use App\Models\User;use Illuminate\Http\Request;use Illuminate\Support\Facades\Auth;use Illuminate\Support\Facades\Hash;use Illuminate\Validation\ValidationException;
class AuthController extends Controller
{
 public function register(Request $r){$data=$r->validate(['name'=>'required|string|max:120','email'=>'required|email|unique:users,email','password'=>'required|string|min:10|confirmed','phone'=>'nullable|string|max:40']);$u=User::create([...$data,'password'=>Hash::make($data['password']),'role'=>'customer']);Auth::login($u);$r->session()->regenerate();return response()->json($u,201);}
 public function login(Request $r){$data=$r->validate(['email'=>'required|email','password'=>'required|string']);if(!Auth::attempt($data,$r->boolean('remember')))throw ValidationException::withMessages(['email'=>['Invalid email or password.']]);$r->session()->regenerate();return $r->user();}
 public function logout(Request $r){Auth::guard('web')->logout();$r->session()->invalidate();$r->session()->regenerateToken();return response()->json(['ok'=>true]);}
 public function me(Request $r){return $r->user();}
}
