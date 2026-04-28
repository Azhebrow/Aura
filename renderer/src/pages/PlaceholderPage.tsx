import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { NavPageDefinition } from '@/shared/config/nav-model';

type Props = {
  page: NavPageDefinition;
};

/** Заглушка до переноса соответствующего экрана из legacy `PageManager`. */
export function PlaceholderPage({ page }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{page.label}</CardTitle>
        <CardDescription>
          Экран «{page.id}» будет перенесён из legacy UI поэтапно (секции → features → страница).
        </CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        Используйте{' '}
        <code className="bg-muted rounded px-1.5 py-0.5 text-xs">npm run start:legacy</code> для полного функционала
        этой вкладки.
      </CardContent>
    </Card>
  );
}
