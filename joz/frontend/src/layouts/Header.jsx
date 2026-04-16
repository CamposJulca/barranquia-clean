import { Search, Bell, User } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';

export function Header() {
  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 fixed top-0 right-0 left-64 z-10">
     <div className="h-full px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 max-w-4xl">
          <a href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-slate-950 font-black text-sm">
              JOZ
            </div>
            <div>
              <p className="text-base font-semibold text-slate-100">JOZ</p>
              <p className="text-xs text-slate-400">Monitoring System</p>
            </div>
          </a>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              type="text"
              placeholder="Buscar tiendas, alertas..."
              className="pl-10 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="relative text-slate-100 hover:bg-slate-800">
            <Bell className="w-5 h-5" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white">
              3
            </Badge>
          </Button>

          <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-100">Admin User</p>
              <p className="text-xs text-slate-500">admin@joz.com</p>
            </div>
            <Avatar>
              <AvatarFallback className="bg-slate-700 text-slate-100">
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
