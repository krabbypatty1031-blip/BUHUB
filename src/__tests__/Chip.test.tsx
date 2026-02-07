import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Chip from '../components/common/Chip';

describe('Chip', () => {
  it('renders label text', () => {
    render(<Chip label="Travel" />);
    expect(screen.getByText('Travel')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<Chip label="Food" onPress={onPress} />);
    fireEvent.press(screen.getByText('Food'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders in selected state', () => {
    const { toJSON } = render(<Chip label="Course" selected />);
    expect(toJSON()).toBeTruthy();
  });
});
