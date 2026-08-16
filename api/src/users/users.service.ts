import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from './entities/user.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import { OnboardingMode, resolveOnboardingMode } from '../auth/onboarding-mode';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly organizationsService: OrganizationsService,
    private readonly configService: ConfigService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const onboardingMode = resolveOnboardingMode(this.configService.get<string>('ONBOARDING_MODE'));
    if (onboardingMode === OnboardingMode.ENTERPRISE) {
      throw new ServiceUnavailableException(
        'Enterprise onboarding mode is not implemented yet. Use ONBOARDING_MODE=self_serve.',
      );
    }

    const hashed = await bcrypt.hash(createUserDto.password, SALT_ROUNDS);
    return this.usersRepository.manager.transaction(async (manager) => {
      const users = manager.getRepository(User);
      const user = users.create({
        ...createUserDto,
        password: hashed,
        role: UserRole.TEST_MANAGER,
      });
      const savedUser = await users.save(user);
      await this.organizationsService.createPersonalOrganization(
        savedUser,
        createUserDto.organizationName,
        manager,
      );
      return savedUser;
    });
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ email });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    await this.findOne(id);
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, SALT_ROUNDS);
    }
    await this.usersRepository.update(id, updateUserDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.usersRepository.delete(id);
  }
}

