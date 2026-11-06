import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { VenueImage } from '../src/components/VenueImage';
const api=vi.hoisted(()=>({download:vi.fn()}));
vi.mock('../src/lib/supabase',()=>({db:()=>({storage:{from:()=>({download:api.download})}})}));
it('shows loading and then error when download fails', async ()=>{
 let finish!: (v:unknown)=>void; api.download.mockReturnValue(new Promise(resolve=>{finish=resolve}));
 render(<VenueImage path="test.jpg" />);expect(screen.getByText('Đang tải ảnh địa điểm…')).toBeVisible();
 finish({data:null,error:{message:'failed'}});expect(await screen.findByText('Ảnh địa điểm hiện không tải được.')).toBeVisible();
});
