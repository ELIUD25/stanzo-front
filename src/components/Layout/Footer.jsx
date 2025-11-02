import { Container, Typography, Link as MuiLink } from '@mui/material';
import { GitHub, Twitter } from '@mui/icons-material';

export const Footer = () => {
  return (
    <footer className="bg-gray-100 py-6 mt-auto">
      <Container maxWidth="lg">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <Typography variant="body2" color="textSecondary">
            © {new Date().getFullYear()} DrinkHub. All rights reserved.
          </Typography>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <MuiLink href="#" color="inherit">
              <GitHub fontSize="small" />
            </MuiLink>
            <MuiLink href="#" color="inherit">
              <Twitter fontSize="small" />
            </MuiLink>
          </div>
        </div>
      </Container>
    </footer>
  );
};