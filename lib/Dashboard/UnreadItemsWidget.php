<?php
declare(strict_types=1);

namespace OCA\News\Dashboard;

use OCA\News\AppInfo\Application;
use OCA\News\Db\Feed;
use OCA\News\Db\ListType;
use OCA\News\Service\FeedServiceV2;
use OCA\News\Service\ItemServiceV2;
use OCP\Dashboard\IAPIWidget;
use OCP\Dashboard\IButtonWidget;
use OCP\Dashboard\IIconWidget;
use OCP\Dashboard\IOptionWidget;
use OCP\Dashboard\Model\WidgetButton;
use OCP\Dashboard\Model\WidgetItem;
use OCP\Dashboard\Model\WidgetOptions;
use OCP\IDateTimeFormatter;
use OCP\IL10N;
use OCP\IURLGenerator;
use OCP\Util;

/**
 * Dashboard widget listing the newest unread articles
 *
 * Implements the v1 item API on purpose: the dashboard renders v2 widgets
 * with its generic one line list and never runs a widget's own script.
 *
 * @package OCA\News\Dashboard
 */
class UnreadItemsWidget implements IAPIWidget, IButtonWidget, IIconWidget, IOptionWidget
{
    public function __construct(
        private readonly IL10N $l10n,
        private readonly IURLGenerator $urlGenerator,
        private readonly IDateTimeFormatter $dateTimeFormatter,
        private readonly ItemServiceV2 $itemService,
        private readonly FeedServiceV2 $feedService,
    ) {
    }

    public function getId(): string
    {
        return 'news-unread';
    }

    public function getTitle(): string
    {
        return $this->l10n->t('Unread articles');
    }

    public function getOrder(): int
    {
        return 50;
    }

    public function getIconClass(): string
    {
        return 'icon-news';
    }

    public function getIconUrl(): string
    {
        return $this->urlGenerator->getAbsoluteURL(
            $this->urlGenerator->imagePath(Application::NAME, 'app-dark.svg')
        );
    }

    public function getUrl(): ?string
    {
        return $this->urlGenerator->linkToRoute('news.page.index');
    }

    public function load(): void
    {
        // Draws the items itself so titles can wrap to two lines; the
        // dashboard's generic item list keeps every line to one line
        Util::addScript(Application::NAME, 'news-dashboard');
        Util::addStyle(Application::NAME, 'dashboard');
    }

    public function getWidgetOptions(): WidgetOptions
    {
        return new WidgetOptions(false);
    }

    public function getWidgetButtons(string $userId): array
    {
        return [
            new WidgetButton(
                WidgetButton::TYPE_MORE,
                $this->urlGenerator->linkToRoute('news.page.index') . 'unread',
                $this->l10n->t('Show all unread articles')
            ),
        ];
    }

    /**
     * @return WidgetItem[]
     */
    public function getItems(string $userId, ?string $since = null, int $limit = 7): array
    {
        $items = $this->itemService->findAllWithFilters($userId, ListType::UNREAD, $limit, 0, false);
        if ($since !== null) {
            $items = array_values(array_filter($items, fn ($item) => $item->getId() > (int) $since));
        }

        $feeds = [];
        foreach ($this->feedService->findAllForUser($userId) as $feed) {
            $feeds[$feed->getId()] = $feed;
        }

        $base = $this->urlGenerator->linkToRoute('news.page.index');
        $widgetItems = [];
        foreach ($items as $item) {
            $feed = $feeds[$item->getFeedId()] ?? null;
            $widgetItems[] = new WidgetItem(
                $item->getTitle() ?? '',
                $this->subtitle($feed, $item->getPubDate()),
                $this->urlGenerator->getAbsoluteURL($base . 'item/' . $item->getId()),
                $feed === null ? '' : $this->feedIconUrl($feed),
                (string) $item->getId()
            );
        }

        return $widgetItems;
    }

    private function subtitle(?Feed $feed, ?int $pubDate): string
    {
        $parts = [];
        if ($feed !== null && $feed->getTitle() !== null) {
            $parts[] = $feed->getTitle();
        }
        if ($pubDate !== null) {
            $parts[] = $this->dateTimeFormatter->formatTimeSpan($pubDate);
        }
        return implode(' · ', $parts);
    }

    private function feedIconUrl(Feed $feed): string
    {
        return $this->urlGenerator->getAbsoluteURL(
            $this->urlGenerator->linkToRoute('news.favicon.get', ['feedUrlHash' => $feed->getUrlHash()])
        );
    }
}
