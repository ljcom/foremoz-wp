import React from 'react';
import PageStateCard from './PageStateCard.jsx';
import { getPageErrorBoundaryConfig } from '../config/app-config.js';

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
    const defaultCopy = getPageErrorBoundaryConfig('defaults');
    const {
      children,
      shellClassName = defaultCopy.shellClassName,
      withBackdrop = defaultCopy.withBackdrop,
      title = defaultCopy.title,
      description = defaultCopy.description,
      homeHref = defaultCopy.homeHref,
      homeLabel = defaultCopy.homeLabel,
      eyebrow = defaultCopy.eyebrow,
      reloadLabel = defaultCopy.reloadLabel
    } = this.props;

    if (this.state.hasError) {
      return (
        <PageStateCard
          shellClassName={shellClassName}
          withBackdrop={withBackdrop}
          eyebrow={eyebrow}
          title={title}
          description={description}
          actions={[
            {
              label: reloadLabel,
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
