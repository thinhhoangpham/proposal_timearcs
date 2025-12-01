#!/usr/bin/env python3
"""
Group sponsors by total money sponsoring projects.
Reads publication.tsv and calculates total funding per sponsor.
"""

import pandas as pd
from pathlib import Path

def group_sponsors_by_total(file_path):
    """
    Read TSV file and group sponsors by total funding amount.
    
    Args:
        file_path: Path to the publication.tsv file
    
    Returns:
        DataFrame with sponsor and total funding, sorted by total descending
    """
    # Read the TSV file
    df = pd.read_csv(file_path, sep='\t', encoding='utf-8')
    
    # Group by sponsor and sum the total column
    sponsor_totals = df.groupby('sponsor')['total'].sum().reset_index()
    
    # Sort by total in descending order
    sponsor_totals = sponsor_totals.sort_values('total', ascending=False)
    
    # Rename columns for clarity
    sponsor_totals.columns = ['Sponsor', 'Total Funding']
    
    return sponsor_totals

def main():
    # Path to the publication.tsv file
    file_path = Path(__file__).parent / 'pubJavascripts' / 'publication.tsv'
    
    # Group sponsors by total funding
    results = group_sponsors_by_total(file_path)
    
    # Display results
    print("=" * 80)
    print("Sponsors Grouped by Total Funding")
    print("=" * 80)
    print(f"\nTotal number of unique sponsors: {len(results)}")
    print(f"\nTotal funding across all sponsors: ${results['Total Funding'].sum():,.2f}")
    print("\n" + "-" * 80)
    print(f"{'Sponsor':<60} {'Total Funding':>20}")
    print("-" * 80)
    
    for _, row in results.iterrows():
        sponsor = row['Sponsor']
        total = row['Total Funding']
        # Truncate long sponsor names for display
        sponsor_display = sponsor[:58] + '..' if len(sponsor) > 60 else sponsor
        print(f"{sponsor_display:<60} ${total:>19,.2f}")
    
    print("-" * 80)
    
    # Also save to CSV for easy reference
    output_file = Path(__file__).parent / 'sponsor_totals.csv'
    results.to_csv(output_file, index=False)
    print(f"\nResults saved to: {output_file}")
    
    return results

if __name__ == '__main__':
    results = main()

