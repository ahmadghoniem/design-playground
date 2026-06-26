import { useSearchParams } from 'react-router-dom';
import PdfViewerClient from './PdfViewerClient';
import { parsePdfViewerPages } from '../lib/pdf-utils';

export function PdfViewerPage() {
  const [searchParams] = useSearchParams();
  const url = searchParams.get('url') ?? undefined;
  const name = searchParams.get('name') ?? undefined;
  const pagesRaw = searchParams.get('pages') ?? undefined;

  const pdfUrl = typeof url === 'string' ? url : '';
  const displayName = typeof name === 'string' && name.trim() ? name.trim() : 'PDF';
  const pages = parsePdfViewerPages(pagesRaw);

  if (!pdfUrl) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-stone-100 text-stone-500 text-sm">
        Missing PDF URL
      </div>
    );
  }

  return <PdfViewerClient pdfUrl={pdfUrl} name={displayName} pages={pages} />;
}
