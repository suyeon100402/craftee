import { createHashRouter } from 'react-router';
import { AppShell } from './AppShell';
import { HomePage } from '../features/home/HomePage';
import { ProjectListPage } from '../features/projects/ProjectListPage';
import { ProjectDetailPage } from '../features/projects/ProjectDetailPage';
import { ProjectFormPage } from '../features/projects/ProjectFormPage';
import { MaterialListPage } from '../features/materials/MaterialListPage';
import { MaterialDetailPage } from '../features/materials/MaterialDetailPage';
import { MaterialFormPage } from '../features/materials/MaterialFormPage';
import { SearchPage } from '../features/search/SearchPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { TrashPage } from '../features/trash/TrashPage';
import { NotFoundPage } from './NotFoundPage';

// 주소에 #을 쓰는 방식(HashRouter)이라 무료 정적 호스팅에서 새로고침해도 페이지를 찾는다.
export const router = createHashRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'works', element: <ProjectListPage mode="works" /> },
      { path: 'plans', element: <ProjectListPage mode="plans" /> },
      { path: 'projects/new', element: <ProjectFormPage /> },
      { path: 'projects/:id', element: <ProjectDetailPage /> },
      { path: 'projects/:id/edit', element: <ProjectFormPage /> },
      { path: 'materials', element: <MaterialListPage /> },
      { path: 'materials/new', element: <MaterialFormPage /> },
      { path: 'materials/:id', element: <MaterialDetailPage /> },
      { path: 'materials/:id/edit', element: <MaterialFormPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'trash', element: <TrashPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
