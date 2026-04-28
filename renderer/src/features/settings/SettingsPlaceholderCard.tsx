import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SettingsPlaceholderCard({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          Полный редактор этой секции пока в legacy UI. Запуск:{' '}
          <code className="text-xs">npm run start:legacy</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        В новом renderer уже доступны: секции страниц, настроения и категории дневника, справочники питания.
      </CardContent>
    </Card>
  );
}
