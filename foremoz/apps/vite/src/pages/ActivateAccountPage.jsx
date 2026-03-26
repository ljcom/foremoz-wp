import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { apiJson } from '../lib.js';

export default function ActivateAccountPage() {
  const [searchParams] = useSearchParams();
  const account = String(searchParams.get('account') || '').trim();
  const fallbackSignInPath = account ? `/a/${account}/signin` : '/signin';
  const [state, setState] = useState({
    loading: true,
    error: '',
    success: false,
    alreadyActive: false,
    signInPath: fallbackSignInPath
  });

  useEffect(() => {
    const token = String(searchParams.get('token') || '').trim();
    if (!token) {
      setState({ loading: false, error: 'Token aktivasi tidak ditemukan.', success: false, alreadyActive: false });
      return;
    }

    let cancelled = false;
    async function runActivation() {
      try {
        const result = await apiJson('/v1/tenant/auth/activate', {
          method: 'POST',
          body: JSON.stringify({ token })
        });
        if (cancelled) return;
        setState({
          loading: false,
          error: '',
          success: true,
          alreadyActive: Boolean(result.already_active),
          signInPath: result.sign_in_path || fallbackSignInPath
        });
      } catch (error) {
        if (cancelled) return;
        setState({
          loading: false,
          error: error.message,
          success: false,
          alreadyActive: false,
          signInPath: fallbackSignInPath
        });
      }
    }

    runActivation();
    return () => {
      cancelled = true;
    };
  }, [fallbackSignInPath, searchParams]);

  return (
    <AuthLayout
      title="Aktivasi akun tenant"
      subtitle="Konfirmasi email user tenant sebelum sign in ke workspace."
      alternateHref={state.signInPath}
      alternateText="Kembali ke sign in"
    >
      <section className="card form">
        {state.loading ? <p className="feedback">Memproses aktivasi akun...</p> : null}
        {!state.loading && state.success ? (
          <>
            <p className="feedback">
              {state.alreadyActive ? 'Akun ini sudah aktif.' : 'Akun berhasil diaktivasi.'}
            </p>
            <p className="feedback">Sekarang kamu bisa sign in ke workspace tenant.</p>
            <Link className="btn" to={`${state.signInPath}?activated=1`}>
              Lanjut ke sign in
            </Link>
          </>
        ) : null}
        {!state.loading && state.error ? (
          <>
            <p className="error">{state.error}</p>
            <Link className="btn" to={state.signInPath}>
              Ke sign in
            </Link>
          </>
        ) : null}
      </section>
    </AuthLayout>
  );
}
