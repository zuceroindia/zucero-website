drop policy if exists "verified users join waitlist" on public.waitlist;
create policy "verified users join waitlist"
on public.waitlist for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and lower(email) = lower(coalesce(((select auth.jwt()) ->> 'email'), ''))
);

drop policy if exists "verified users submit inquiries" on public.contact_inquiries;
create policy "verified users submit inquiries"
on public.contact_inquiries for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and lower(email) = lower(coalesce(((select auth.jwt()) ->> 'email'), ''))
);

create index if not exists waitlist_user_idx on public.waitlist(user_id);
create index if not exists contact_inquiries_user_idx on public.contact_inquiries(user_id);

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
