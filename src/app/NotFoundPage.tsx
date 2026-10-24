import { Link } from 'react-router';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';

export function NotFoundPage({ message = '페이지를 찾을 수 없어요' }: { message?: string }) {
  return (
    <>
      <PageHeader title="" back="/" />
      <EmptyState
        title={message}
        description="지워졌거나 주소가 바뀌었을 수 있어요."
        action={
          <Link to="/" className="btn btn-primary">
            홈으로
          </Link>
        }
      />
    </>
  );
}
