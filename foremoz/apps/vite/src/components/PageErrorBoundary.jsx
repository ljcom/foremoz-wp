import React from 'react';
import PageStateCard from './PageStateCard.jsx';

export default class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Page render failed', error, errorInfo);
  }

  render() {
    const {
      children,
      shellClassName = 'dashboard',
      withBackdrop = false,
      title = 'Halaman gagal dirender',
      description = 'Terjadi error tidak terduga saat menyiapkan halaman ini.',
      homeHref = '/',
      homeLabel = 'Kembali'
    } = this.props;

    if (this.state.hasError) {
      return (
        <PageStateCard
          shellClassName={shellClassName}
          withBackdrop={withBackdrop}
          eyebrow="Error Boundary"
          title={title}
          description={description}
          actions={[
            {
              label: 'Reload page',
              onClick: () => {
                if (typeof window !== 'undefined') window.location.reload();
              }
            },
            { label: homeLabel, to: homeHref, variant: 'ghost' }
          ]}
        >
          {this.state.error?.message ? <p className="error">{this.state.error.message}</p> : null}
        </PageStateCard>
      );
    }

    return children;
  }
}
