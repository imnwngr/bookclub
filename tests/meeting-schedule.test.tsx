import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { MeetingSchedule } from "../src/components/MeetingSchedule";
import type { ClubEvent } from "../src/types/domain";
vi.mock("../src/components/VenueImage", () => ({ VenueImage: ({ path }: { path: string }) => <img src={path} alt="Ảnh địa điểm" /> }));
const event = {id:'1',code:'event',title:'Buổi gặp',description:'',starts_at:'2024-02-28T17:00:00Z',ends_at:'2024-03-01T02:30:00Z',status:'published',venue_name:'Hội trường',address:'Cần Thơ',directions:'',latitude:null,longitude:null,place_id:'',maps_url:'https://maps.app.goo.gl/example',created_at:'',updated_at:''} as ClubEvent;
it('renders leap day and a range crossing months using Vietnam dates', () => {
 const {container}=render(<MeetingSchedule event={event} />);
 expect(screen.getByRole('heading',{name:'Tháng 2 / 2024',level:4})).toBeVisible();
 expect(screen.getByRole('heading',{name:'Tháng 3 / 2024'})).toBeVisible();
 expect(container.querySelector('.calendar-start')).toHaveTextContent('29');
 expect(container.querySelector('.calendar-end')).toHaveTextContent('1');
 expect(container.querySelector('.calendar-card footer')).toHaveTextContent('00:00 – 09:30');
});
it('renders same-day and year-spanning dates', () => {
 const {container,rerender}=render(<MeetingSchedule event={{...event,starts_at:'2025-12-30T17:00:00Z',ends_at:'2026-01-02T00:00:00Z'}} />);
 expect(container.querySelectorAll('.calendar-between')).toHaveLength(1);
 expect(screen.getByRole('heading',{name:'Tháng 1 / 2026'})).toBeVisible();
 rerender(<MeetingSchedule event={{...event,starts_at:'2024-02-01T01:00:00Z',ends_at:'2024-02-01T03:00:00Z'}} />);
 expect(container.querySelectorAll('.calendar-months > div')).toHaveLength(1);
 expect(container.querySelectorAll('.calendar-start')).toHaveLength(1);
});
it('switches tabs, shows fallback image state, copies address and uses safe map link', async () => {
 const user=userEvent.setup();const writeText=vi.fn().mockResolvedValue(undefined);
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText}});
 render(<MeetingSchedule event={event} />);
 expect(screen.getByRole('button',{name:'Bản đồ Google Maps'})).toHaveAttribute('aria-pressed','true');
 await user.click(screen.getByRole('button',{name:'Hình ảnh địa điểm'}));
 expect(screen.getByText('Chưa có ảnh địa điểm.')).toBeVisible();
 await user.click(screen.getByRole('button',{name:'Sao chép địa chỉ'}));
 expect(writeText).toHaveBeenCalledWith('Cần Thơ');
 expect(screen.getByText('Đã sao chép địa chỉ.')).toBeVisible();
 const link=screen.getByRole('link',{name:'Chỉ đường'});
 expect(link).toHaveAttribute('href',event.maps_url);expect(link).toHaveAttribute('rel','noopener noreferrer');
});
it('defaults to image when available and rejects unsafe map URLs', () => {
 render(<MeetingSchedule event={{...event,venue_image_path:'fixture.jpg',maps_url:'javascript:alert(1)',address:''}} />);
 expect(screen.getByRole('img',{name:'Ảnh địa điểm'})).toHaveAttribute('src','fixture.jpg');
 expect(screen.getByRole('button',{name:'Sao chép địa chỉ'})).toBeDisabled();
 expect(screen.queryByRole('link',{name:'Chỉ đường'})).toBeNull();
});

it('reports clipboard write errors', async () => {
 const user=userEvent.setup(); Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:vi.fn().mockRejectedValue(new Error('denied'))}});
 render(<MeetingSchedule event={event} />); await user.click(screen.getByRole('button',{name:'Sao chép địa chỉ'}));
 expect(await screen.findByText('Không thể sao chép địa chỉ.')).toBeVisible();
});
