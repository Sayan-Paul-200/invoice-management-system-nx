import { Title, Text } from '@mantine/core';

type PageTitleProps = {
  title: string;
  description: string;
};

export function PageTitle({ title, description }: PageTitleProps) {
  return (
    <>
      <Title order={2}>{title}</Title>
      <Text size="md" style={{ marginBottom: '40px' }}>
        {description}
      </Text>
    </>
  );
}
