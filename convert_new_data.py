import pandas as pd

# Read the Excel file
df = pd.read_excel('all 2.xlsx')

# Ensure date_submitted is in YYYY-MM-DD format
df['date_submitted'] = pd.to_datetime(df['date_submitted']).dt.strftime('%Y-%m-%d')

# Function to convert "Last, First" to "First Last"
def convert_name(name):
    if not isinstance(name, str):
        return str(name)
    parts = name.split(',')
    if len(parts) == 2:
        return f"{parts[1].strip()} {parts[0].strip()}"
    return name

# Apply conversion to PI column
df['PI'] = df['PI'].apply(convert_name)

# Rename PI to Authors
df = df.rename(columns={'PI': 'Authors'})

# Save to TSV
output_file = 'data/publication_new.tsv'
df.to_csv(output_file, sep='\t', index=False)

print(f"Converted data saved to {output_file}")
print(f"Total rows: {len(df)}")
print(f"Unique proposals: {df['proposal_no'].nunique()}")
print("Sample authors:", df['Authors'].head().tolist())
