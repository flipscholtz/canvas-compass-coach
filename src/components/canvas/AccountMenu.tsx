import { LogOut, UserRound } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useCanvasStore } from "@/lib/canvas/store";
import { clearAccountWorkspace } from "@/lib/canvas/cloud-scenarios";

export function AccountMenu() {
  const author = useCanvasStore((s) => s.author);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  async function signOut() {
    await queryClient.cancelQueries(); queryClient.clear();
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error("Couldn't sign out. Please try again."); return; }
    clearAccountWorkspace();
    await navigate({ to: "/auth", replace: true });
  }
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-11 md:size-8" aria-label={`Account: ${author}`}><UserRound /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem disabled>{author}</DropdownMenuItem><DropdownMenuItem onClick={() => void signOut()}><LogOut /> Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
}