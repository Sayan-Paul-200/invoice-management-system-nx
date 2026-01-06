import { useState } from 'react';
import { Box, Collapse, Group, ThemeIcon } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import { NavbarMenu } from '@routes/utils';
import classes from './LinksGroup.module.scss';

export function LinksGroup({ icon: Icon, label, initiallyOpened, link, submenus }: NavbarMenu) {
  const hasSubmenus = !!submenus && Array.isArray(submenus);
  const [opened, setOpened] = useState(initiallyOpened ?? false);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // If there are submenus, do not allow the default link behavior
    if (hasSubmenus) {
      e.preventDefault();
    }

    setOpened((o) => !o);
  };

  const items = (hasSubmenus ? submenus : []).map((submenu) => (
    <a className={classes.link} href={submenu.link} key={submenu.label}>
      {submenu.label}
    </a>
  ));

  return (
    <>
      <a onClick={handleLinkClick} href={link} className={classes.control}>
        <Group justify="space-between" gap={0}>
          <Box style={{ display: 'flex', alignItems: 'center' }}>
            <ThemeIcon variant="light" size={30}>
              <Icon size={18} />
            </ThemeIcon>
            <Box ml="md">{label}</Box>
          </Box>
          {hasSubmenus && (
            <IconChevronRight className={classes.chevron} stroke={1.5} size={16} style={{ transform: opened ? 'rotate(-90deg)' : 'none' }} />
          )}
        </Group>
      </a>
      {hasSubmenus ? <Collapse in={opened}>{items}</Collapse> : null}
    </>
  );
}
