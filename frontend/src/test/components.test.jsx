import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../components/common/Button';
import StatsCard from '../components/dashboard/StatsCard';

describe('Button Component', () => {
  it('renders with text', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeDefined();
  });

  it('shows loading spinner when loading', () => {
    const { container } = render(<Button loading>Submit</Button>);
    expect(container.querySelector('.btn-spinner')).toBeDefined();
  });

  it('is disabled when loading', () => {
    render(<Button loading>Submit</Button>);
    expect(screen.getByRole('button')).toHaveProperty('disabled', true);
  });

  it('calls onClick handler', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick} disabled>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders correct variant class', () => {
    const { container } = render(<Button variant="danger">Danger</Button>);
    expect(container.querySelector('.btn-danger')).toBeDefined();
  });
});

describe('StatsCard Component', () => {
  it('renders with value and title', () => {
    render(<StatsCard title="Revenue" value="৳50,000" />);
    expect(screen.getByText('Revenue')).toBeDefined();
    expect(screen.getByText('৳50,000')).toBeDefined();
  });

  it('shows skeleton when loading', () => {
    const { container } = render(<StatsCard title="Revenue" value="0" loading />);
    expect(container.querySelector('.skeleton')).toBeDefined();
  });

  it('shows subtitle when provided', () => {
    render(<StatsCard title="Revenue" value="৳50,000" subtitle="This month" />);
    expect(screen.getByText('This month')).toBeDefined();
  });

  it('shows trend indicator', () => {
    const { container } = render(<StatsCard title="Revenue" value="৳50,000" trendValue={12.5} />);
    expect(screen.getByText('12.5%')).toBeDefined();
    expect(container.querySelector('.trend-up')).toBeDefined();
  });

  it('shows negative trend indicator', () => {
    const { container } = render(<StatsCard title="Revenue" value="৳50,000" trendValue={-5} />);
    expect(container.querySelector('.trend-down')).toBeDefined();
  });
});
