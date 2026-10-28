import { DeleteAccount, SettingsForm } from '@/components/settings-form';
import { PageHeader } from '@/components/ui';
import { requireUserPage } from '@/lib/auth/session';
import { getProfile } from '@/lib/users';

export const metadata = { title: 'Settings' };

export default async function Settings() {
  const user = await requireUserPage();
  const p = await getProfile(user.uid);
  return (
    <>
      <PageHeader title="Settings" description="Your profile and the services you offer." />
      <div className="max-w-2xl space-y-6">
        <section className="panel" aria-labelledby="pf">
          <div className="panel-head"><h2 id="pf" className="panel-title">Profile</h2><span className="text-xs text-faint">{user.email}</span></div>
          <SettingsForm initial={{ displayName: p.displayName, country: p.country, services: p.services }} />
        </section>
        <section className="panel border-danger" aria-labelledby="dz">
          <div className="panel-head"><h2 id="dz" className="panel-title text-danger">Delete account</h2></div>
          <DeleteAccount />
        </section>
      </div>
    </>
  );
}
