'use client';

import { getExistingProjectsListWithoutLoader } from '@database/projects';
import { resolveProjectImageUrl } from '@lib/image/projectImageDisplay';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import type { ProjectMetadata, SpecialMenuStatus } from '@template/main-app/projects/types';
import { Avatar, Card, Dropdown, Flex, Skeleton, Tag, Typography, theme } from 'antd';
import type { MenuProps } from 'antd';
import { getLocaleDirection } from '@lib/localization/config';
import { useLocale, useTranslations } from 'next-intl';
import { useContext, useEffect, useMemo } from 'react';
import { LuCheck, LuChevronDown, LuLayers, LuSparkles, LuXCircle } from 'react-icons/lu';
import useSWR from 'swr';
import styles from './OwnerBusinessAssistant.module.scss';

const { Text } = Typography;
const { useToken } = theme;

const ALL_MENUS_SCOPE = '__all_menus__';

type BusinessHealthScopeProject = ProjectMetadata & {
  active?: boolean;
  deleted?: boolean;
  isSpecialMenu?: boolean;
  specialMenuBaseProjectId?: string;
  specialMenuEndsAt?: string;
  specialMenuStatus?: SpecialMenuStatus;
};

const AVATAR_COLOR_FACTORY: Array<(token: any) => { bg: string; text: string }> = [
  (token) => ({ bg: token.colorPrimaryBg, text: token.colorPrimary }),
  (token) => ({ bg: token.colorSuccessBg, text: token.colorSuccess }),
  (token) => ({ bg: token.colorWarningBg, text: token.colorWarning }),
  (token) => ({ bg: token.colorInfoBg, text: token.colorInfo }),
  (token) => ({ bg: token.colorErrorBg, text: token.colorError }),
];

const getAvatarColor = (name: string, token: any) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLOR_FACTORY[Math.abs(hash) % AVATAR_COLOR_FACTORY.length](token);
};

const getInitials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const resolveProjectName = (value: BusinessHealthScopeProject['name'] | undefined, fallback: string) =>
  getLocalizedText(value, undefined, getPrimaryLocalizedLanguage(value, 'en'), fallback);

const isSelectableProject = (project: BusinessHealthScopeProject) => project.deleted !== true;

type DashboardTranslator = (key: string, values?: Record<string, string | number>) => string;

const renderProjectTags = (project: BusinessHealthScopeProject | null | undefined, t: DashboardTranslator) => {
  if (!project) return null;

  return (
    <>
      {project.isDefault ? <Tag color="processing" style={{ marginInlineEnd: 0 }}>{t('projectSelector.default')}</Tag> : null}
      {project.isSpecialMenu ? <Tag color="success" icon={<LuSparkles size={12} />} style={{ marginInlineEnd: 0 }}>{t('projectSelector.special')}</Tag> : null}
      {project.active === false ? (
        <Tag color="error" style={{ marginInlineEnd: 0 }}>
          <Flex align="center" gap={4}>
            <LuXCircle size={13} />
            <span>{t('projectSelector.inactive')}</span>
          </Flex>
        </Tag>
      ) : null}
    </>
  );
};

export function BusinessHealthProjectScopeSelector({
  onChange,
  selectedProjectId,
}: {
  onChange: (projectId?: string) => void;
  selectedProjectId?: string;
}) {
  const { token } = useToken();
  const locale = useLocale();
  const t = useTranslations('Dashboard.owner');
  const { storeDetails } = useContext(PlatformGlobalDataContext);
  const storeScope = storeDetails?.storeId ? String(storeDetails.storeId) : null;
  const tenantScope = storeDetails?.tenantId ? String(storeDetails.tenantId) : null;
  const { data, isLoading } = useSWR(
    storeScope && tenantScope ? ['businessHealthProjectScope', tenantScope, storeScope] : null,
    () => getExistingProjectsListWithoutLoader(true),
    { dedupingInterval: 60 * 60 * 1000, revalidateOnFocus: false },
  );

  const projects = useMemo(
    () => (((data as { projects?: BusinessHealthScopeProject[] } | null)?.projects || []).filter(isSelectableProject)),
    [data],
  );
  const selectedProject = selectedProjectId
    ? projects.find((project) => project.projectId === selectedProjectId)
    : null;

  useEffect(() => {
    if (isLoading || !selectedProjectId) return;
    if (!projects.some((project) => project.projectId === selectedProjectId)) {
      onChange(undefined);
    }
  }, [isLoading, onChange, projects, selectedProjectId]);

  const selectedName = selectedProject
    ? resolveProjectName(selectedProject.name, t('projectSelector.untitled'))
    : t('businessHealth.scope.allMenus');
  const selectedColor = selectedProject
    ? getAvatarColor(selectedName, token)
    : { bg: token.colorPrimaryBg, text: token.colorPrimary };
  const activeScope = selectedProject?.projectId || ALL_MENUS_SCOPE;

  const menuItems: MenuProps['items'] = [
    {
      key: ALL_MENUS_SCOPE,
      label: (
        <Flex align="center" gap={12}>
          <Avatar size={24} style={{ background: token.colorPrimaryBg, color: token.colorPrimary }}>
            <LuLayers size={14} />
          </Avatar>
          <Flex vertical style={{ flex: 1, minWidth: 0 }}>
            <Text>{t('businessHealth.scope.allMenus')}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {projects.length
                ? t('businessHealth.scope.menuCount', { count: projects.length })
                : t('businessHealth.scope.locationLevel')}
            </Text>
          </Flex>
          {activeScope === ALL_MENUS_SCOPE ? <LuCheck size={14} color={token.colorPrimary} /> : null}
        </Flex>
      ),
      onClick: () => onChange(undefined),
    },
    ...projects.map((project) => {
      const name = resolveProjectName(project.name, t('projectSelector.untitled'));
      const color = getAvatarColor(name, token);
      return {
        key: project.projectId || name,
        label: (
          <Flex align="center" gap={12}>
            <Avatar
              size={24}
              src={resolveProjectImageUrl(project.projectImage) || undefined}
              style={{ background: color.bg, color: color.text, fontSize: 10 }}
            >
              {getInitials(name)}
            </Avatar>
            <Flex vertical style={{ flex: 1, minWidth: 0 }}>
              <Text>{name}</Text>
            </Flex>
            {renderProjectTags(project, t)}
            {project.projectId === selectedProject?.projectId ? <LuCheck size={14} color={token.colorPrimary} /> : null}
          </Flex>
        ),
        onClick: () => project.projectId && onChange(project.projectId),
      };
    }),
  ];

  return (
    <Card className={styles.scopeSelectorCard} styles={{ body: { padding: 12 } }}>
      <Flex align="center" gap={12} justify="space-between" wrap="wrap">
        <Flex vertical style={{ minWidth: 0 }}>
          <Text type="secondary">{t('viewing')}</Text>
          <Text strong>{t('businessHealth.scope.title')}</Text>
        </Flex>
        {isLoading ? (
          <Skeleton.Input active size="small" style={{ width: 180 }} />
        ) : (
          <Dropdown
            menu={{ items: menuItems }}
            placement={getLocaleDirection(locale) === 'rtl' ? 'bottomLeft' : 'bottomRight'}
            trigger={['click']}
          >
            <button
              aria-haspopup="menu"
              aria-label={`${t('businessHealth.scope.title')}: ${selectedName}`}
              className={styles.scopeSelectorTrigger}
              type="button"
            >
              <Flex align="center" gap={10}>
                <Avatar
                  size={28}
                  src={resolveProjectImageUrl(selectedProject?.projectImage) || undefined}
                  style={{ background: selectedColor.bg, color: selectedColor.text, fontSize: 11 }}
                >
                  {selectedProject ? getInitials(selectedName) : <LuLayers size={14} />}
                </Avatar>
                <Flex vertical style={{ minWidth: 0 }}>
                  <Text strong ellipsis style={{ maxWidth: 180 }}>{selectedName}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {selectedProject
                      ? t('businessHealth.scope.thisMenuOnly')
                      : t('businessHealth.scope.allMenusInLocation')}
                  </Text>
                </Flex>
                <LuChevronDown size={14} color={token.colorTextSecondary} />
              </Flex>
            </button>
          </Dropdown>
        )}
      </Flex>
    </Card>
  );
}
