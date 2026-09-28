<?php

namespace OCA\News\Dashboard;

use OCA\News\Db\Feed;
use OCA\News\Db\Item;
use OCA\News\Db\ListType;
use OCA\News\Service\FeedServiceV2;
use OCA\News\Service\ItemServiceV2;
use OCP\Dashboard\Model\WidgetButton;
use OCP\IDateTimeFormatter;
use OCP\IL10N;
use OCP\IURLGenerator;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class UnreadItemsWidgetTest extends TestCase
{
    /**
     * @var MockObject|ItemServiceV2
     */
    private $itemService;

    /**
     * @var MockObject|FeedServiceV2
     */
    private $feedService;

    /**
     * @var MockObject|IURLGenerator
     */
    private $generator;

    /**
     * @var UnreadItemsWidget
     */
    private $class;

    protected function setUp(): void
    {
        $l10n = $this->getMockBuilder(IL10N::class)
            ->disableOriginalConstructor()
            ->getMock();
        $l10n->method('t')->willReturnArgument(0);

        $formatter = $this->getMockBuilder(IDateTimeFormatter::class)
            ->disableOriginalConstructor()
            ->getMock();
        $formatter->method('formatTimeSpan')->willReturn('2 hours ago');

        $this->generator = $this->getMockBuilder(IURLGenerator::class)
            ->disableOriginalConstructor()
            ->getMock();
        $this->generator->method('linkToRoute')
            ->willReturnCallback(function (string $route, array $params = []) {
                if ($route === 'news.favicon.get') {
                    return '/apps/news/favicon/' . $params['feedUrlHash'];
                }
                return '/apps/news/';
            });
        $this->generator->method('getAbsoluteURL')
            ->willReturnCallback(fn (string $url) => 'https://cloud.example' . $url);

        $this->itemService = $this->getMockBuilder(ItemServiceV2::class)
            ->disableOriginalConstructor()
            ->getMock();
        $this->feedService = $this->getMockBuilder(FeedServiceV2::class)
            ->disableOriginalConstructor()
            ->getMock();

        $this->class = new UnreadItemsWidget(
            $l10n,
            $this->generator,
            $formatter,
            $this->itemService,
            $this->feedService
        );
    }

    private function item(int $id, int $feedId, string $title): Item
    {
        $item = new Item();
        $item->setId($id);
        $item->setFeedId($feedId);
        $item->setTitle($title);
        $item->setPubDate(1790000000);
        return $item;
    }

    private function feed(int $id, string $title, string $urlHash): Feed
    {
        $feed = new Feed();
        $feed->setId($id);
        $feed->setTitle($title);
        $feed->setUrlHash($urlHash);
        return $feed;
    }

    public function testGetId()
    {
        $this->assertSame('news-unread', $this->class->getId());
    }

    public function testGetItems()
    {
        $this->itemService->expects($this->once())
            ->method('findAllWithFilters')
            ->with('user', ListType::UNREAD, 7, 0, false)
            ->willReturn([$this->item(12, 1, 'Newest'), $this->item(11, 2, 'Older')]);
        $this->feedService->expects($this->once())
            ->method('findAllForUser')
            ->with('user')
            ->willReturn([$this->feed(1, 'Swedroid', 'abc'), $this->feed(2, 'SweClockers', 'def')]);

        $items = array_map(fn ($item) => $item->jsonSerialize(), $this->class->getItems('user'));

        $this->assertCount(2, $items);
        $this->assertSame([
            'subtitle' => 'Swedroid · 2 hours ago',
            'title' => 'Newest',
            'link' => 'https://cloud.example/apps/news/item/12',
            'iconUrl' => 'https://cloud.example/apps/news/favicon/abc',
            'overlayIconUrl' => '',
            'sinceId' => '12',
        ], $items[0]);
        $this->assertSame('SweClockers · 2 hours ago', $items[1]['subtitle']);
    }

    public function testGetItemsSince()
    {
        $this->itemService->method('findAllWithFilters')
            ->willReturn([$this->item(12, 1, 'Newest'), $this->item(11, 1, 'Older')]);
        $this->feedService->method('findAllForUser')
            ->willReturn([$this->feed(1, 'Swedroid', 'abc')]);

        $items = $this->class->getItems('user', '11');

        $this->assertCount(1, $items);
        $this->assertSame('Newest', array_values($items)[0]->getTitle());
    }

    public function testGetItemsWithoutFeed()
    {
        $this->itemService->method('findAllWithFilters')
            ->willReturn([$this->item(12, 3, 'Orphan')]);
        $this->feedService->method('findAllForUser')->willReturn([]);

        $item = $this->class->getItems('user')[0]->jsonSerialize();

        $this->assertSame('2 hours ago', $item['subtitle']);
        $this->assertSame('', $item['iconUrl']);
    }

    public function testGetWidgetButtons()
    {
        $buttons = $this->class->getWidgetButtons('user');

        $this->assertCount(1, $buttons);
        $this->assertSame(WidgetButton::TYPE_MORE, $buttons[0]->getType());
        $this->assertSame('/apps/news/unread', $buttons[0]->getLink());
    }
}
