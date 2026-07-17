// saper.cpp : Defines the entry point for the console application.
//

#include <iostream>
#include <conio.h>
#include <stdlib.h>
#include <time.h>

using namespace std;

	int m,n,a,c;
	int Arr[200][200];

void MakePole()
{
	int x,y,i,j;

	for (i=1; i<=a; ++i)
	{
		do
		{
			x=1+rand()%(m-1);
			y=1+rand()%(n-1);
		} while(Arr[x][y]==9);
		Arr[x][y]=9;
	}
	for (i=1; i<=m; ++i)
	{
		for (j=1; j<=n; ++j)
		{
			if (Arr[i][j]!=9)
			{
				Arr[i][j]=0;
				if (i>1 && Arr[i-1][j]==9)
				{
					++Arr[i][j];
				}
				if (i>1 && j<n && Arr[i-1][j+1]==9)
				{
					++Arr[i][j];
				}
				if (j<n && Arr[i][j+1]==9)
				{
					++Arr[i][j];
				}
				if (i<m && j<n && Arr[i+1][j+1]==9)
				{
					++Arr[i][j];
				}
				if (i<m && Arr[i+1][j]==9)
				{
					++Arr[i][j];
				}
				if (i<m && j>1 && Arr[i+1][j-1]==9)
				{
					++Arr[i][j];
				}
				if (j>1 && Arr[i][j-1]==9)
				{
					++Arr[i][j];
				}
				if (i>1 && j>1 && Arr[i-1][j-1]==9)
				{
					++Arr[i][j];
				}
			}
		}
	}
}

void WritePole()
{
	int i,j;

	for (i=1; i<=m; ++i)
	{
		for (j=1; j<=n; ++j)
		{
			if (Arr[i][j]<0)
			{
				if (Arr[i][j]==-10)
				{
					cout << 0 << ' ';
				}
				else
				if (Arr[i][j]==-9)
				{
					cout << "# ";
				}
				else
				{
					cout << -Arr[i][j] << ' ';
				}
			}
			else
			{
				cout << "x ";
			}
		}
		cout << endl;
	}
	getch();
}

void Open(int i, int j)
{

	if (Arr[i][j]==0)
	{	
		++c;
		Arr[i][j]=-10;
		if (i>1)
		{
			Open(i-1,j);
		}
		if (i>1 && j<n)
		{
			Open(i-1,j+1);
		}
		if (j<n)
		{
			Open(i,j+1);
		}
		if (i<m && j<n)
		{
			Open(i+1,j+1);
		}
		if (i<m)
		{
			Open(i+1,j);
		}
		if (i<m && j>1)
		{
			Open(i+1,j-1);
		}
		if (j>1)
		{
			Open(i,j-1);
		}
		if (i>1 && j>1)
		{
			Open(i-1,j-1);
		}
	}
	else
	{
		if (Arr[i][j]!=-10 && Arr[i][j]>0)
		{
			++c;
			Arr[i][j]=-Arr[i][j];
		}
	}
}

int main(int argc, char* argv[])
{
	int i,j,x,y;
	bool flag;

	cout << "Input size" << endl;
	cin >> m >> n;
	cout << "Input number of mines" << endl; 
	cin >> a;
	srand(time(NULL));
	MakePole();
	WritePole();
	c=0;
	flag=true;
	while (m*n-a>c && flag)
	{
		cout << "Enter i,j - where to go" << endl;
		cin >> i >> j;
		if (Arr[i][j]==9)
		{
			for (x=1; x<=m; ++x)
			{
				for (y=1; y<=n; ++y)
				{
					if (Arr[x][y]>=0)
					{
						if (Arr[x][y]==0)
						{
							Arr[x][y]=-10;
						}
						else
						{
							Arr[x][y]=-Arr[x][y];
						}
					}
				}
			}	
			flag=false;
			WritePole();
		}
		if (Arr[i][j]>=1 && Arr[i][j]<=8)
		{
			Arr[i][j]=-Arr[i][j];
			WritePole();
			++c;
		}
		if (Arr[i][j]==0)
		{
			Open(i,j);
			WritePole();
		}
	}
	if (flag)
	{
		cout << "YOU WIN!!!";
	}
	else
	{
		cout << "YOU LOSE!!!";
	}
	getch();
	return 0;
}
